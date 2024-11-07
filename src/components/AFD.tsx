import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const AFDContainer = styled.div`
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

  p {
    color: ${(props) => props.theme.colors.text.primary};
    margin: 0.5rem 0;
    line-height: 1.5;
    font-size: 0.9rem;
  }

  pre {
    white-space: pre-wrap;
    word-wrap: break-word;
    margin: 0.5rem 0;
    font-family: monospace;
    font-size: 0.85rem;
    line-height: 1.4;
    color: ${(props) => props.theme.colors.text.primary};
    background-color: ${(props) => props.theme.colors.backgroundDark};
    padding: 0.5rem;
    border-radius: 4px;
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

interface AFDProps {
  afd: string;
  wfo: string;
  timestamp: string;
}

const AFD: React.FC<AFDProps> = ({ afd, wfo, timestamp }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formattedContent, setFormattedContent] = useState<JSX.Element[]>([]);

  useEffect(() => {
    const formatAFD = () => {
      const container: JSX.Element[] = [];
      const lines = afd.split('\n');

      // Skip the first 8 lines as they contain unnecessary information
      lines.splice(0, 8);

      let currentParagraphContent = '';
      let currentPreContent = '';

      lines.forEach((line, index) => {
        // Skip section endings
        if (line.match(/^&&$/)) {
          return;
        }

        // Handle preformatted sections (usually containing numbers and multiple spaces)
        if (/\s{2,}/.test(line) && /\d/.test(line)) {
          currentPreContent += line + '\n';
          return;
        } else if (currentPreContent.length > 0) {
          container.push(<pre key={`pre-${index}`}>{currentPreContent}</pre>);
          currentPreContent = '';
          return;
        }

        // Handle headings
        const headingRegex = /^\.([\w\s\/()-]+)\.\.\./i;
        const match = line.match(headingRegex);

        // Create paragraph for accumulated content when hitting a heading or empty line
        if (match || line.length === 0) {
          if (currentParagraphContent.trim()) {
            container.push(<p key={`p-${index}`}>{currentParagraphContent.trim()}</p>);
            currentParagraphContent = '';
          }
        }

        // Add heading
        if (match) {
          container.push(<h2 key={`h-${index}`}>{match[1].trim()}</h2>);
          line = line.replace(headingRegex, ''); // Remove heading from line
        }

        // Accumulate paragraph content
        currentParagraphContent += line + ' ';
      });

      // Add any remaining paragraph content
      if (currentParagraphContent.trim()) {
        container.push(<p key="final-p">{currentParagraphContent.trim()}</p>);
      }

      setFormattedContent(container);
    };

    formatAFD();
  }, [afd, wfo, timestamp]);

  return (
    <AFDContainer>
      <Title>{wfo} Area Forecast Discussion</Title>
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
    </AFDContainer>
  );
};

export default AFD;
