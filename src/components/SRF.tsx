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

  pre {
    white-space: pre;
    word-wrap: normal;
    margin: 0.5rem 0;
    font-family: monospace;
    font-size: 0.85rem;
    line-height: 1.4;
    color: ${(props) => props.theme.colors.text.primary};
    overflow-x: auto;
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
      // Remove any carriage returns and extra newlines
      const cleanedText = srf
        .replace(/\r/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      setFormattedContent(<pre>{cleanedText}</pre>);
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
