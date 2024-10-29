import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

interface SatelliteViewerProps {
  weatherOfficeCode: string;
}

const VideoContainer = styled.div`
  position: relative;
  height: 300px;
  background-color: ${(props) => props.theme.colors.backgroundLight};
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Message = styled.div`
  padding: 30px;
  text-align: center;
`;

const Timestamp = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.5);
  color: ${(props) => props.theme.colors.text.secondary};
  padding: 5px;
  border-radius: 5px;
  font-size: 12px;
`;

const SatelliteViewer: React.FC<SatelliteViewerProps> = ({ weatherOfficeCode }) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestVideo = async () => {
      try {
        const lowerCaseCode = weatherOfficeCode.toLowerCase();
        const response = await fetch(`https://cdn.star.nesdis.noaa.gov/WFO/${lowerCaseCode}/GEOCOLOR/`);
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'));
        const mp4Links = links.filter((link) => link.href.endsWith('.mp4'));
        if (mp4Links.length > 0) {
          const latestMp4 = mp4Links[mp4Links.length - 1];
          const latestMp4Href = latestMp4.getAttribute('href');
          const nextSibling = latestMp4.nextSibling;
          if (nextSibling && nextSibling.textContent) {
            const match = nextSibling.textContent.trim().match(/(\d{2}-\w{3}-\d{4} \d{2}:\d{2})/);
            if (match) {
              const timestampText = match[0];
              const utcDate = new Date(timestampText + ' UTC');
              const localDate = utcDate.toLocaleString();
              setTimestamp(localDate);
            }
          }
          setVideoUrl(`https://cdn.star.nesdis.noaa.gov/WFO/${lowerCaseCode}/GEOCOLOR/${latestMp4Href}`);
        } else {
          setError('No video found.');
        }
      } catch (e) {
        setError('Failed to fetch video.');
      }
    };

    fetchLatestVideo();
  }, [weatherOfficeCode]);

  return (
    <VideoContainer>
      {error ? (
        <Message>
          Sorry! There was an error:
          <br />
          {error}
        </Message>
      ) : !videoUrl ? (
        <Message>Loading video...</Message>
      ) : (
        <>
          <video
            controls
            muted
            autoPlay
            loop
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            poster={`https://cdn.star.nesdis.noaa.gov/WFO/${weatherOfficeCode.toLowerCase()}/GEOCOLOR/latest.jpg`}
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          {timestamp && <Timestamp>{timestamp}</Timestamp>}
        </>
      )}
    </VideoContainer>
  );
};

export default SatelliteViewer;
