package com.harirrou.fedyet

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.viewmodel.compose.viewModel
import com.harirrou.fedyet.ui.board.BoardScreen
import com.harirrou.fedyet.ui.board.BoardViewModel
import com.harirrou.fedyet.ui.theme.FedYetTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val container = (application as FedYetApp).container
        setContent {
            FedYetTheme {
                val boardViewModel: BoardViewModel = viewModel(factory = BoardViewModel.factory(container))
                BoardScreen(boardViewModel)
            }
        }
    }
}
