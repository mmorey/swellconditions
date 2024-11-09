import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
  background-color: ${(props) => props.theme.colors.backgroundLight};
`;

const StyledVideo = styled.video`
  width: 100%;
  display: block;
`;

interface VideoPlayerProps {
  playlistUrl: string;
  rotationInterval?: number; // in seconds
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ playlistUrl, rotationInterval }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playlist, setPlaylist] = useState<string[]>([]);

  useEffect(() => {
    // Fetch and parse the m3u8 playlist
    const fetchPlaylist = async () => {
      try {
        const response = await fetch(playlistUrl);
        const content = await response.text();

        // Parse m3u8 content to extract video URLs
        const lines = content.split('\n');
        const videoUrls = lines
          .filter((line) => line.trim() && !line.startsWith('#'))
          .map((line) => {
            // Handle both absolute and relative URLs
            if (line.startsWith('http')) {
              return line;
            } else {
              const baseUrl = playlistUrl.substring(0, playlistUrl.lastIndexOf('/') + 1);
              return baseUrl + line;
            }
          });

        setPlaylist(videoUrls);

        // Start with the first video
        if (videoRef.current && videoUrls.length > 0) {
          videoRef.current.src = videoUrls[0];
          videoRef.current.play().catch((e) => console.error('Error playing video:', e));
        }
      } catch (error) {
        console.error('Error fetching playlist:', error);
      }
    };

    fetchPlaylist();
  }, [playlistUrl]);

  useEffect(() => {
    if (!rotationInterval || playlist.length <= 1) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % playlist.length;
      if (videoRef.current && playlist[currentIndex]) {
        videoRef.current.src = playlist[currentIndex];
        videoRef.current.play().catch((e) => console.error('Error playing video:', e));
      }
    }, rotationInterval * 1000);

    return () => clearInterval(interval);
  }, [rotationInterval, playlist]);

  return (
    <VideoContainer>
      <StyledVideo ref={videoRef} controls playsInline muted autoPlay />
    </VideoContainer>
  );
};

export default VideoPlayer;
