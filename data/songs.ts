import type { Song } from "@/types/live";
import { generatedSongs } from "./generated-songs";

// File này không cần sửa khi thêm bài. Catalog được tạo từ public/songs/*/info.txt.
export const songs: Song[] = generatedSongs;

export const getSong = (id: string | null) => songs.find((song) => song.id === id);
