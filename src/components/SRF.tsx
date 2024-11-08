import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const SRFContainer = styled.div`
  width: 100%;
  background-color: ${(props) => props.theme.colors.backgroundLight};
  border-radius: 10px;
  margin-bottom: 10px;
`;

const TextContainer = styled.div<{ $isExpanded: boolean }>`
  height: ${(props) => (props.$isExpanded ? 'auto' : '200px')};
  overflow: hidden;
  position: relative;
  padding: 0 1rem 1rem 1rem;
`;

const ContentContainer = styled.div`
  h2 {
    color: ${(props) => props.theme.colors.text.primary};
    font-size: 1.1rem;
    margin: 1rem 0 0.5rem 0;
    text-transform: capitalize;
  }

  h3 {
    color: ${(props) => props.theme.colors.text.primary};
    font-size: 1rem;
    margin: 1rem 0 0.5rem 0;
    text-transform: capitalize;
  }

  p {
    margin: 0.5rem 0;
    font-size: 0.85rem;
    line-height: 1.4;
    color: ${(props) => props.theme.colors.text.primary};
  }

  .tide-data {
    margin-left: 2rem;
  }

  .tide-location {
    margin-left: 2rem;
    font-weight: bold;
  }
`;

const IssuerInfo = styled.p`
  text-align: center;
  font-size: 0.8rem;
  color: ${(props) => props.theme.colors.text.secondary};
  margin: 0.5rem 0 1rem 0;
  padding: 0 1rem;

  a {
    color: ${(props) => props.theme.colors.text.link};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const GradientOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  background: linear-gradient(transparent, ${(props) => props.theme.colors.backgroundLight});
`;

const ExpandButton = styled.button`
  background: none;
  border: none;
  color: ${(props) => props.theme.colors.text.link};
  cursor: pointer;
  padding: 8px;
  font-size: 14px;
  display: block;
  margin: 0 auto 10px;

  &:hover {
    text-decoration: underline;
  }
`;

const Title = styled.h2`
  text-align: center;
  font-size: 12px;
  color: ${(props) => props.theme.colors.text.primary};
  padding-top: 10px;
  margin: 0;
`;

interface SRFProps {
  srf: string;
  wfo: string;
  timestamp: string;
}

const SRF: React.FC<SRFProps> = ({ srf, wfo, timestamp }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formattedContent, setFormattedContent] = useState<JSX.Element | null>(null);

  useEffect(() => {
    const formatSRF = () => {
      // Remove any carriage returns
      const cleanedText = srf.replace(/\r/g, '');

      // Split into lines
      const lines = cleanedText.split('\n');

      let inTideSection = false;
      let expectingTideLocation = false;
      let foundFirstHeading = false;

      // Process each line
      const formattedLines = lines
        .map((line) => {
          // Convert .WORD... pattern to heading
          const headingMatch = line.match(/^\.([\w]+)\.\.\.$/);
          if (headingMatch) {
            foundFirstHeading = true;
            inTideSection = false;
            expectingTideLocation = false;
            return `<h2>${headingMatch[1].toLowerCase()}</h2>`;
          }

          // Skip all lines until we find the first heading
          if (!foundFirstHeading) {
            return null;
          }

          // Skip empty lines and lines with just &&
          if (line.trim() === '' || line.trim() === '&&') {
            return null;
          }

          // Detect Tides... pattern as subheading
          const tidesMatch = line.match(/^Tides\.+$/);
          if (tidesMatch) {
            inTideSection = true;
            expectingTideLocation = true;
            return `<h3>Tides</h3>`;
          }

          // If we're expecting a tide location and the line is indented
          if (expectingTideLocation && line.startsWith(' ')) {
            expectingTideLocation = false;
            // Extract location name from the line
            const locationMatch = line.match(/^\s+([^\.]+)\.+/);
            if (locationMatch) {
              const location = locationMatch[1].trim();
              // Return just the location as a separate line
              return `<p class="tide-location">${location}</p>`;
            }
          }

          // Convert Key............Value format to Key: Value
          const keyValueMatch = line.match(/^([^\.]+)\.+\s*([^\.]+)\.?$/);
          if (keyValueMatch) {
            const [, key, value] = keyValueMatch;
            // Remove any trailing asterisks from the key
            const cleanKey = key.replace(/\*+$/, '').trim();

            // If we find a non-indented key-value pair and we're not expecting a tide location,
            // we're no longer in the tide section
            if (!line.trim().startsWith(' ') && !expectingTideLocation) {
              inTideSection = false;
              return `<p>${cleanKey}: ${value.trim()}</p>`;
            }

            if (inTideSection) {
              return `<p class="tide-data">${value.trim()}</p>`;
            }
            return `<p>${cleanKey}: ${value.trim()}</p>`;
          }

          // Handle indented tide data lines that don't match the key-value pattern
          if (inTideSection && line.trim().startsWith(' ')) {
            return `<p class="tide-data">${line.trim()}</p>`;
          }

          // Wrap any remaining lines in paragraph tags
          return `<p>${line}</p>`;
        })
        .filter((line) => line !== null) // Remove null lines
        .join('');

      setFormattedContent(<div dangerouslySetInnerHTML={{ __html: formattedLines }} />);
    };

    formatSRF();
  }, [srf]);

  return (
    <SRFContainer>
      <Title>{wfo} Surf Forecast</Title>
      <TextContainer $isExpanded={isExpanded}>
        <ContentContainer>{formattedContent}</ContentContainer>
        {!isExpanded && <GradientOverlay />}
      </TextContainer>
      <ExpandButton onClick={() => setIsExpanded(!isExpanded)}>{isExpanded ? 'Show Less' : 'Show More'}</ExpandButton>
      <IssuerInfo>
        Issued by{' '}
        <a href={`https://www.weather.gov/${wfo}/`} target="_blank" rel="noopener noreferrer">
          {wfo.toUpperCase()}
        </a>
        {` at ${new Date(timestamp).toLocaleString('en-US')}.`}
      </IssuerInfo>
    </SRFContainer>
  );
};

export default SRF;
