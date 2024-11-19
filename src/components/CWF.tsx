import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const CWFContainer = styled.div`
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
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.4;
    color: ${(props) => props.theme.colors.text.primary};
  }

  ul {
    margin: 0.5rem 0;
    padding-left: 2rem;
    font-size: 0.85rem;
    line-height: 1.4;
    color: ${(props) => props.theme.colors.text.primary};
  }

  .warning {
    color: #d32f2f;
    font-weight: bold;
    margin: 0.5rem 0;
  }

  pre {
    font-family: monospace;
    white-space: pre;
    overflow-x: auto;
    font-size: 0.85rem;
    line-height: 1.4;
    color: ${(props) => props.theme.colors.text.primary};
    margin: 0;
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

interface CWFProps {
  cwf: string;
  wfo: string;
  timestamp: string;
  simpleFormat?: boolean;
}

const CWF: React.FC<CWFProps> = ({ cwf, wfo, timestamp, simpleFormat = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formattedContent, setFormattedContent] = useState<JSX.Element | null>(null);

  useEffect(() => {
    const formatCWF = () => {
      // If simpleFormat is true, just wrap in pre tag
      if (simpleFormat) {
        // Remove any carriage returns and first 8 lines
        const cleanedText = cwf.replace(/\r/g, '').split('\n').slice(8).join('\n');
        setFormattedContent(<pre>{cleanedText}</pre>);
        return;
      }

      // Remove any carriage returns
      const cleanedText = cwf.replace(/\r/g, '');

      // Split into lines
      const lines = cleanedText.split('\n');

      let lineCount = 0;
      let inBulletList = false;
      let currentBulletList: string[] = [];

      // Process each line
      const formattedLines = lines
        .map((line, index) => {
          lineCount++;

          // Skip the first 8 lines
          if (lineCount <= 8) {
            return null;
          }

          // Check for warning pattern
          const warningMatch = line.match(/\.\.\.([A-Z\s]+(?:RISK|WARNING|ADVISORY))\.\.\.$/);
          if (warningMatch) {
            const warning = warningMatch[1]
              .toLowerCase()
              .split(' ')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            return `<p class="warning">Warning: ${warning}</p>`;
          }

          // Convert .WORD... pattern to heading
          const headingMatch = line.match(/^\.([\w\s]+)\.\.\.$/);
          if (headingMatch) {
            // If we were in a bullet list, close it before the heading
            if (inBulletList) {
              const list = `<ul>${currentBulletList.join('')}</ul>`;
              currentBulletList = [];
              inBulletList = false;
              return list + `<h2>${headingMatch[1].toLowerCase()}</h2>`;
            }
            return `<h2>${headingMatch[1].toLowerCase()}</h2>`;
          }

          // Skip empty lines and lines with just &&
          if (line.trim() === '' || line.trim() === '&&') {
            // If we were in a bullet list, close it before the empty line
            if (inBulletList) {
              const list = `<ul>${currentBulletList.join('')}</ul>`;
              currentBulletList = [];
              inBulletList = false;
              return list;
            }
            return null;
          }

          // Handle bullet points
          const bulletMatch = line.match(/^\s*\*\s*(.+)$/);
          if (bulletMatch) {
            inBulletList = true;
            currentBulletList.push(`<li>${bulletMatch[1]}</li>`);

            // If this is the last line or the next line doesn't start with *, output the list
            if (index === lines.length - 1 || !lines[index + 1].trim().startsWith('*')) {
              const list = `<ul>${currentBulletList.join('')}</ul>`;
              currentBulletList = [];
              inBulletList = false;
              return list;
            }
            return null;
          }

          // Convert Key............Value format to Key: Value
          const keyValueMatch = line.match(/^([^\.]+)\.+\s*([^\.]+)\.?$/);
          if (keyValueMatch) {
            const [, key, value] = keyValueMatch;
            // Remove any trailing asterisks from the key
            const cleanKey = key.replace(/\*+$/, '').trim();
            return `<p>${cleanKey}: ${value.trim()}</p>`;
          }

          // Wrap any remaining lines in paragraph tags
          return `<p>${line}</p>`;
        })
        .filter((line) => line !== null) // Remove null lines
        .join('');

      setFormattedContent(<div dangerouslySetInnerHTML={{ __html: formattedLines }} />);
    };

    formatCWF();
  }, [cwf, simpleFormat]);

  return (
    <CWFContainer>
      <Title>{wfo} Coastal Waters Forecast</Title>
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
    </CWFContainer>
  );
};

export default CWF;
