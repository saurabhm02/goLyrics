import Foundation
import MediaPlayer

let info = MPNowPlayingInfoCenter.default().nowPlayingInfo
guard let info = info, !info.isEmpty else {
    fputs("", stdout)
    exit(0)
}

let title = info[MPMediaItemPropertyTitle] as? String ?? ""
let artist = info[MPMediaItemPropertyArtist] as? String ?? ""
let album = info[MPMediaItemPropertyAlbumTitle] as? String ?? ""
let duration = info[MPMediaItemPropertyPlaybackDuration] as? Double ?? 0
let elapsed = info[MPNowPlayingInfoPropertyElapsedPlaybackTime] as? Double ?? 0
let rate = info[MPNowPlayingInfoPropertyPlaybackRate] as? Double ?? 0

let parts = [title, artist, album, String(duration), String(elapsed), String(rate)]
print(parts.joined(separator: "||"))
