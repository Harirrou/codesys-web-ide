// Wispbloom — JSON save in persistentDataPath, same schema as the
// prototype's localStorage save (see unity/Docs/GAMEPLAY_SPEC.md §8).
using System;
using System.IO;
using UnityEngine;

namespace Wispbloom.Game
{
    [Serializable]
    public class SaveData
    {
        public int version = 1;
        public int[] stars = new int[16];
        public int bestEndless;
        public string dailyKey = "";
        public int dailyBest;
        public string trailCosmetic = "wisp";
        public string coreCosmetic = "classic";
        public bool glyphs = false;
        public bool sound = true;
        public bool music = true;
        public bool vibration = true;
        public bool reduceMotion = false;
    }

    public static class SaveService
    {
        static SaveData _data;
        static string Path => System.IO.Path.Combine(Application.persistentDataPath, "wispbloom-save.json");

        public static SaveData Data
        {
            get
            {
                if (_data == null) Load();
                return _data;
            }
        }

        static void Load()
        {
            try
            {
                _data = File.Exists(Path)
                    ? JsonUtility.FromJson<SaveData>(File.ReadAllText(Path)) ?? new SaveData()
                    : new SaveData();
            }
            catch { _data = new SaveData(); }
        }

        public static void Flush()
        {
            if (_data == null) return;
            try { File.WriteAllText(Path, JsonUtility.ToJson(_data)); }
            catch { /* storage best-effort, session still plays */ }
        }

        public static void RecordStars(int levelIndex, int stars)
        {
            if (levelIndex < 0 || levelIndex >= Data.stars.Length) return;
            if (stars > Data.stars[levelIndex])
            {
                Data.stars[levelIndex] = stars;
                Flush();
            }
        }
    }
}
