package com.harirrou.fedyet.data

import android.content.Context
import android.util.Log
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldPath
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.QuerySnapshot
import com.google.firebase.firestore.SetOptions
import com.google.firebase.firestore.Source
import com.google.firebase.firestore.WriteBatch
import com.harirrou.fedyet.engine.LogEntry
import com.harirrou.fedyet.engine.Need
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.util.Date
import java.util.UUID
import kotlin.math.absoluteValue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull

/**
 * A home shared between phones through Cloud Firestore.
 *
 * Reads come from live listeners, so a tick on one phone shows on the others within a second
 * or two. Writes are applied to the local cache at once and sent when there is a connection,
 * so the app keeps working offline. Writes are never awaited, except joining a home, which
 * cannot work offline.
 */
class FirestoreHomeRepository(
    context: Context,
    private val auth: FirebaseAuth,
    private val db: FirebaseFirestore,
    private val clock: () -> Instant,
    private val scope: CoroutineScope,
) : HomeRepository {

    private val prefs = context.getSharedPreferences("sync", Context.MODE_PRIVATE)
    private val photos = context.getSharedPreferences("pet_photos", Context.MODE_PRIVATE)
    private val readyState = MutableStateFlow(false)
    private val homeState = MutableStateFlow<HomeSnapshot?>(null)
    private val freshState = MutableStateFlow(false)

    override val ready: StateFlow<Boolean> = readyState
    override val home: StateFlow<HomeSnapshot?> = homeState
    override val canSync: Boolean = true

    private val uidState = MutableStateFlow(auth.currentUser?.uid)

    /** The signed-in user, once there is one. Null only until the first sign-in has worked. */
    val userId: StateFlow<String?> = uidState

    private var listeners: List<ListenerRegistration> = emptyList()
    private var parts = Parts()
    private var signingIn = false

    /** The latest snapshot of each part of the home. The home is shown once every part has arrived. */
    private data class Parts(
        val homeId: String? = null,
        val home: DocumentSnapshot? = null,
        val members: QuerySnapshot? = null,
        val pets: QuerySnapshot? = null,
        val needs: QuerySnapshot? = null,
        val supplies: QuerySnapshot? = null,
        val days: QuerySnapshot? = null,
    ) {
        private val queries get() = listOf(members, pets, needs, supplies, days)
        val complete get() = home != null && queries.all { it != null }
        val fromServer get() = complete && !home!!.metadata.isFromCache && queries.all { !it!!.metadata.isFromCache }
    }

    init {
        auth.addAuthStateListener { uidState.value = it.currentUser?.uid }
        // A saved home shows straight from the phone's cache; no network needed to start.
        prefs.getString(KEY_HOME, null)?.let(::attach)
        readyState.value = true
        startSignIn()
    }

    /**
     * Anonymous sign-in: no account, no email. Needs the network only the first time, then
     * survives restarts. The attempt is never cut short (a slow phone may need a while);
     * callers only wait for it as long as they can.
     */
    private fun startSignIn() {
        if (auth.currentUser != null || signingIn) return
        signingIn = true
        auth.signInAnonymously()
            .addOnFailureListener { Log.w(TAG, "Sign-in failed", it) }
            .addOnCompleteListener { signingIn = false }
    }

    private suspend fun ensureSignedIn(): String? {
        auth.currentUser?.let { return it.uid }
        startSignIn()
        return withTimeoutOrNull(SIGN_IN_WAIT_MS) { uidState.first { it != null } }
    }

    private fun homeRef(id: String) = db.collection("homes").document(id)

    // ---- Listening ----

    private fun attach(homeId: String) {
        detach()
        parts = Parts(homeId = homeId)
        freshState.value = false
        val ref = homeRef(homeId)
        val windowStart = dayKey(clock().minus(Duration.ofDays(WINDOW_DAYS)), ZoneId.systemDefault())
        if (parts.complete) retries = 0

        fun onError(error: FirebaseFirestoreException?) {
            if (error?.code == FirebaseFirestoreException.Code.PERMISSION_DENIED) {
                checkStillMember(homeId)
            } else if (error != null) {
                Log.w(TAG, "Listener error", error)
            }
        }

        listeners = listOf(
            ref.addSnapshotListener { snap, error ->
                onError(error)
                if (snap != null && !snap.exists() && !snap.metadata.isFromCache && !snap.metadata.hasPendingWrites()) {
                    checkStillMember(homeId)
                } else if (snap != null) {
                    update { it.copy(home = snap) }
                }
            },
            ref.collection("members").addSnapshotListener { s, e -> onError(e); s?.let { snap -> update { it.copy(members = snap) } } },
            ref.collection("pets").addSnapshotListener { s, e -> onError(e); s?.let { snap -> update { it.copy(pets = snap) } } },
            ref.collection("needs").addSnapshotListener { s, e -> onError(e); s?.let { snap -> update { it.copy(needs = snap) } } },
            ref.collection("supplies").addSnapshotListener { s, e -> onError(e); s?.let { snap -> update { it.copy(supplies = snap) } } },
            ref.collection("days").whereGreaterThanOrEqualTo(FieldPath.documentId(), windowStart)
                .addSnapshotListener { s, e -> onError(e); s?.let { snap -> update { it.copy(days = snap) } } },
        )
    }

    private var checking = false
    private var retries = 0

    /**
     * The server said no, or said the home is gone. That happens when someone removed us or
     * deleted the home, but also for a moment right after joining or creating, before the
     * server has the new member record. A home is only forgotten once the server confirms we
     * are no longer in it; otherwise listening starts again.
     */
    private fun checkStillMember(homeId: String) {
        if (checking || parts.homeId != homeId) return
        checking = true
        scope.launch {
            try {
                val me = auth.currentUser?.uid
                val stillIn = if (me == null) {
                    null
                } else {
                    withTimeoutOrNull(15_000) {
                        runCatching {
                            homeRef(homeId).collection("members").document(me).get(Source.SERVER).await().exists()
                        }.getOrElse { error ->
                            // Not allowed to read our own record: the home is gone or we were removed.
                            if ((error as? FirebaseFirestoreException)?.code == FirebaseFirestoreException.Code.PERMISSION_DENIED) false else null
                        }
                    }
                }
                when {
                    parts.homeId != homeId -> Unit
                    stillIn == false -> {
                        Log.i(TAG, "No longer in home $homeId")
                        forget()
                    }
                    retries < MAX_RETRIES -> {
                        // Still a member, or the network could not say: listen again shortly.
                        retries++
                        delay(2_000L * retries)
                        if (parts.homeId == homeId) attach(homeId)
                    }
                }
            } finally {
                checking = false
            }
        }
    }

    private fun detach() {
        listeners.forEach { it.remove() }
        listeners = emptyList()
    }

    /** Stops following the current home on this phone. */
    private fun forget() {
        detach()
        retries = 0
        prefs.edit().remove(KEY_HOME).apply()
        parts = Parts()
        homeState.value = null
        freshState.value = true
    }

    private fun update(change: (Parts) -> Parts) {
        val next = change(parts)
        if (next.homeId != parts.homeId) return
        parts = next
        if (!next.complete) return
        val home = next.home!!
        if (!home.exists()) return
        val me = auth.currentUser?.uid ?: return

        val needDocs = next.needs!!.documents
        val window = next.days!!.documents.flatMap { FirestoreMapping.logsFrom(it.data.orEmpty()) }
        val doneRefs = needDocs.flatMap { FirestoreMapping.doneRefsFrom(it.id, it.data.orEmpty()) }

        homeState.value = HomeSnapshot(
            id = home.id,
            name = home.getString("name") ?: "",
            zone = runCatching { ZoneId.of(home.getString("tz")) }.getOrDefault(ZoneId.systemDefault()),
            meId = me,
            members = next.members!!.documents.map { FirestoreMapping.memberFrom(it.id, it.data.orEmpty()) }
                .sortedWith(compareBy({ it.id != me }, { it.name })),
            pets = next.pets!!.documents.map { FirestoreMapping.petFrom(it.id, it.data.orEmpty(), photos.getString(it.id, null)) }
                .sortedBy { it.name.lowercase() },
            needs = needDocs.mapNotNull { FirestoreMapping.needFrom(it.id, it.data.orEmpty()) }.sortedBy { it.createdAt },
            logs = FirestoreMapping.mergeLogs(window, doneRefs),
            supplies = next.supplies!!.documents.map { FirestoreMapping.supplyFrom(it.id, it.data.orEmpty()) }
                .sortedBy { it.label.lowercase() },
            synced = true,
        )
        if (next.fromServer) freshState.value = true
    }

    override suspend fun awaitFresh(timeoutMs: Long) {
        if (prefs.getString(KEY_HOME, null) == null) return
        withTimeoutOrNull(timeoutMs) { freshState.first { it } }
    }

    // ---- Creating, importing, joining ----

    override suspend fun createHome(homeName: String, myName: String) {
        val me = ensureSignedIn() ?: error("Not signed in")
        val homeId = db.collection("homes").document().id
        val ref = homeRef(homeId)
        db.batch()
            .set(ref, FirestoreMapping.home(homeName, ZoneId.systemDefault().id, me))
            .set(ref.collection("members").document(me), FirestoreMapping.member(myName, MemberTints[0], ROLE_OWNER))
            .commitAndWait()
        remember(homeId)
    }

    /** Uploads a home that so far lived only on this phone, with its history. Returns false if not signed in. */
    suspend fun importHome(local: HomeSnapshot): Boolean {
        val me = ensureSignedIn() ?: return false
        val homeId = db.collection("homes").document().id
        val ref = homeRef(homeId)
        val myName = local.member(local.meId)?.name ?: "Me"

        // The home and its owner go first: every later write is checked against them.
        db.batch()
            .set(ref, FirestoreMapping.home(local.name, local.zone.id, me))
            .set(ref.collection("members").document(me), FirestoreMapping.member(myName, MemberTints[0], ROLE_OWNER))
            .commitAndWait()

        val byId = { id: String -> if (id == local.meId) me else id }
        val writes = mutableListOf<(WriteBatch) -> Unit>()
        local.pets.forEach { pet ->
            pet.photoPath?.let { photos.edit().putString(pet.id, it).apply() }
            writes += { it.set(ref.collection("pets").document(pet.id), FirestoreMapping.pet(pet)) }
        }
        local.needs.forEach { need ->
            val live = local.logs.filter { it.needId == need.id && !it.undone }.sortedBy { it.at }.map { it.copy(by = byId(it.by)) }
            val data = FirestoreMapping.need(need).toMutableMap()
            live.lastOrNull()?.let { data["lastDone"] = FirestoreMapping.doneRef(it) }
            live.dropLast(1).lastOrNull()?.let { data["prevDone"] = FirestoreMapping.doneRef(it) }
            writes += { it.set(ref.collection("needs").document(need.id), data) }
        }
        local.supplies.forEach { supply -> writes += { it.set(ref.collection("supplies").document(supply.id), FirestoreMapping.supply(supply)) } }
        local.logs.groupBy { dayKey(it.at, local.zone) }.forEach { (day, logs) ->
            val map = logs.associate { it.id to FirestoreMapping.log(it.copy(by = byId(it.by))) }
            writes += { it.set(ref.collection("days").document(day), mapOf("logs" to map)) }
        }
        writes.chunked(400).forEach { chunk -> db.batch().also { batch -> chunk.forEach { it(batch) } }.commitQuietly() }
        remember(homeId)
        return true
    }

    override suspend fun createSampleHome() = error("The sample home is kept on the phone")

    override suspend fun createInvite(): String? {
        val home = homeState.value ?: return null
        val me = auth.currentUser?.uid ?: return null
        val code = InviteCodes.generate()
        val expires = Date.from(clock().plus(Duration.ofDays(INVITE_DAYS)))
        db.collection("invites").document(code)
            .set(mapOf("homeId" to home.id, "role" to ROLE_MEMBER, "createdBy" to me, "expiresAt" to Timestamp(expires)))
            .addOnFailureListener { Log.w(TAG, "Invite not saved", it) }
        return code
    }

    override suspend fun joinHome(code: String, myName: String): JoinResult {
        val clean = InviteCodes.normalise(code)
        if (!InviteCodes.looksValid(clean)) return JoinResult.NOT_FOUND
        val me = ensureSignedIn() ?: return JoinResult.OFFLINE
        return try {
            val invite = withTimeoutOrNull(15_000) {
                db.collection("invites").document(clean).get(Source.SERVER).await()
            } ?: return JoinResult.OFFLINE
            if (!invite.exists()) return JoinResult.NOT_FOUND
            val homeId = invite.getString("homeId") ?: return JoinResult.NOT_FOUND
            val role = invite.getString("role") ?: ROLE_MEMBER
            val expires = invite.getTimestamp("expiresAt")?.toDate()?.toInstant()
            if (expires == null || !expires.isAfter(clock())) return JoinResult.EXPIRED
            val tint = MemberTints[1 + (me.hashCode().absoluteValue % (MemberTints.size - 1))]
            withTimeoutOrNull(15_000) {
                homeRef(homeId).collection("members").document(me)
                    .set(FirestoreMapping.member(myName, tint, role, inviteCode = clean)).await()
            } ?: return JoinResult.OFFLINE
            remember(homeId)
            JoinResult.JOINED
        } catch (e: FirebaseFirestoreException) {
            Log.w(TAG, "Join failed", e)
            when (e.code) {
                FirebaseFirestoreException.Code.PERMISSION_DENIED -> JoinResult.EXPIRED
                FirebaseFirestoreException.Code.UNAVAILABLE -> JoinResult.OFFLINE
                else -> JoinResult.NOT_FOUND
            }
        }
    }

    private fun remember(homeId: String) {
        prefs.edit().putString(KEY_HOME, homeId).apply()
        attach(homeId)
    }

    // ---- Changes ----

    override suspend fun renameHome(name: String) = withHome { home ->
        homeRef(home.id).update("name", name).logFailure()
    }

    override suspend fun renameMe(name: String) = withHome { home ->
        homeRef(home.id).collection("members").document(home.meId).update("name", name).logFailure()
    }

    override suspend fun addLog(needId: String, at: Instant): LogEntry? {
        val home = homeState.value ?: return null
        val need = home.need(needId) ?: return null
        val entry = LogEntry(UUID.randomUUID().toString(), needId, home.meId, at)
        val ref = homeRef(home.id)
        val previous = home.logs.filter { it.needId == needId && !it.undone }.maxByOrNull { it.at }

        val batch = db.batch()
            .set(
                ref.collection("days").document(dayKey(at, home.zone)),
                mapOf("logs" to mapOf(entry.id to FirestoreMapping.log(entry))),
                SetOptions.merge(),
            )
            .update(
                ref.collection("needs").document(needId),
                mapOf(
                    "lastDone" to FirestoreMapping.doneRef(entry),
                    "prevDone" to (previous?.let(FirestoreMapping::doneRef) ?: FieldValue.delete()),
                ),
            )
        home.supplies.filter { it.needId == needId }.forEach {
            batch.update(ref.collection("supplies").document(it.id), "remaining", (it.remaining - it.perUse).coerceAtLeast(0.0))
        }
        batch.commitQuietly()
        return entry
    }

    override suspend fun undo(logId: String) = withHome { home ->
        val entry = home.logs.firstOrNull { it.id == logId && !it.undone } ?: return@withHome
        val ref = homeRef(home.id)
        val batch = db.batch().set(
            ref.collection("days").document(dayKey(entry.at, home.zone)),
            mapOf("logs" to mapOf(entry.id to FirestoreMapping.log(entry.copy(undone = true)))),
            SetOptions.merge(),
        )
        // Move the need's record of its last tick back to the one before.
        val remaining = home.logs.filter { it.needId == entry.needId && !it.undone && it.id != logId }.sortedBy { it.at }
        batch.update(
            ref.collection("needs").document(entry.needId),
            mapOf(
                "lastDone" to (remaining.lastOrNull()?.let(FirestoreMapping::doneRef) ?: FieldValue.delete()),
                "prevDone" to (remaining.dropLast(1).lastOrNull()?.let(FirestoreMapping::doneRef) ?: FieldValue.delete()),
            ),
        )
        home.supplies.filter { it.needId == entry.needId }.forEach {
            batch.update(ref.collection("supplies").document(it.id), "remaining", it.remaining + it.perUse)
        }
        batch.commitQuietly()
    }

    override suspend fun savePet(pet: Pet, newNeeds: List<Need>) = withHome { home ->
        val ref = homeRef(home.id)
        photos.edit().apply { if (pet.photoPath != null) putString(pet.id, pet.photoPath) else remove(pet.id) }.apply()
        val batch = db.batch().set(ref.collection("pets").document(pet.id), FirestoreMapping.pet(pet))
        newNeeds.forEach { batch.set(ref.collection("needs").document(it.id), FirestoreMapping.need(it)) }
        batch.commitQuietly()
        // The photo lives only on this phone, so the listener cannot bring it back: show it now.
        homeState.value = homeState.value?.let { HomeEdits.savePet(it, pet, newNeeds) }
    }

    override suspend fun deletePet(petId: String) = withHome { home ->
        val ref = homeRef(home.id)
        val needIds = home.needs.filter { it.petId == petId }.map { it.id }.toSet()
        val batch = db.batch().delete(ref.collection("pets").document(petId))
        needIds.forEach { batch.delete(ref.collection("needs").document(it)) }
        home.supplies.filter { it.needId in needIds }.forEach {
            batch.update(ref.collection("supplies").document(it.id), "needId", FieldValue.delete())
        }
        batch.commitQuietly()
        photos.edit().remove(petId).apply()
    }

    override suspend fun saveNeed(need: Need) = withHome { home ->
        // Merge, so the record of its last ticks is kept.
        homeRef(home.id).collection("needs").document(need.id).set(FirestoreMapping.need(need), SetOptions.merge()).logFailure()
    }

    override suspend fun deleteNeed(needId: String) = withHome { home ->
        val ref = homeRef(home.id)
        val batch = db.batch().delete(ref.collection("needs").document(needId))
        home.supplies.filter { it.needId == needId }.forEach {
            batch.update(ref.collection("supplies").document(it.id), "needId", FieldValue.delete())
        }
        batch.commitQuietly()
    }

    override suspend fun saveSupply(supply: Supply) = withHome { home ->
        homeRef(home.id).collection("supplies").document(supply.id).set(FirestoreMapping.supply(supply)).logFailure()
    }

    override suspend fun deleteSupply(supplyId: String) = withHome { home ->
        homeRef(home.id).collection("supplies").document(supplyId).delete().logFailure()
    }

    override suspend fun allLogs(): List<LogEntry> {
        val home = homeState.value ?: return emptyList()
        val days = withTimeoutOrNull(15_000) { runCatching { homeRef(home.id).collection("days").get().await() }.getOrNull() }
            ?: return home.logs
        return FirestoreMapping.mergeLogs(days.documents.flatMap { FirestoreMapping.logsFrom(it.data.orEmpty()) }, home.logs)
    }

    /**
     * The owner deletes the home for everyone. Anyone else leaves it. Firestore does not delete a
     * document's sub-collections with it, so the owner removes each part first and the home last.
     */
    override suspend fun deleteEverything() {
        val home = homeState.value ?: return forget()
        val ref = homeRef(home.id)
        val me = home.meId
        if (!home.iAmOwner) {
            ref.collection("members").document(me).delete().logFailure()
            return forget()
        }
        val days = withTimeoutOrNull(15_000) { runCatching { ref.collection("days").get().await().documents }.getOrNull() }.orEmpty()
        val deletions = buildList {
            days.forEach { add(it.reference) }
            home.needs.forEach { add(ref.collection("needs").document(it.id)) }
            home.pets.forEach { add(ref.collection("pets").document(it.id)) }
            home.supplies.forEach { add(ref.collection("supplies").document(it.id)) }
            home.members.filter { it.id != me }.forEach { add(ref.collection("members").document(it.id)) }
        }
        deletions.chunked(400).forEach { chunk -> db.batch().also { b -> chunk.forEach(b::delete) }.commitQuietly() }
        // Last, in one batch: the rules check ownership against the state before the batch.
        db.batch().delete(ref).delete(ref.collection("members").document(me)).commitQuietly()
        home.pets.forEach { photos.edit().remove(it.id).apply() }
        forget()
    }

    private inline fun withHome(block: (HomeSnapshot) -> Unit) {
        homeState.value?.let(block)
    }

    /**
     * Waits a little for the server to accept a write that later ones depend on. Offline the
     * write still lands in the local cache and is sent later, so this never blocks for long.
     */
    private suspend fun WriteBatch.commitAndWait() {
        val task = commit().addOnFailureListener { Log.w(TAG, "Write failed", it) }
        withTimeoutOrNull(10_000) { runCatching { task.await() } }
    }

    private fun WriteBatch.commitQuietly() {
        commit().addOnFailureListener { Log.w(TAG, "Write failed", it) }
    }

    private fun <T> com.google.android.gms.tasks.Task<T>.logFailure() {
        addOnFailureListener { Log.w(TAG, "Write failed", it) }
    }

    companion object {
        private const val TAG = "FedYetSync"
        private const val KEY_HOME = "homeId"

        /** How many days of logs are kept live. Older ticks still count through lastDone/prevDone. */
        const val WINDOW_DAYS = 40L
        const val INVITE_DAYS = 7L
        private const val SIGN_IN_WAIT_MS = 30_000L
        private const val MAX_RETRIES = 5

        fun dayKey(at: Instant, zone: ZoneId): String = at.atZone(zone).toLocalDate().toString()
    }
}
