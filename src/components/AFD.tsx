import React, { useState } from 'react';
import styled from 'styled-components';

const AFDContainer = styled.div`
  width: 100%;
  background-color: ${(props) => props.theme.colors.backgroundLight};
  border-radius: 10px;
  margin-bottom: 10px;
`;

const TextContainer = styled.div<{ $isExpanded: boolean }>`
  height: ${(props) => (props.$isExpanded ? 'auto' : '300px')};
  overflow: hidden;
  position: relative;
  padding: 1rem;
`;

const PreformattedText = styled.pre`
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
  color: ${(props) => props.theme.colors.text.primary};
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
}

const AFD: React.FC<AFDProps> = ({ afd }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <AFDContainer>
      <Title>Area Forecast Discussion</Title>
      <TextContainer $isExpanded={isExpanded}>
        <PreformattedText>{afd}</PreformattedText>
        {!isExpanded && <GradientOverlay />}
      </TextContainer>
      <ExpandButton onClick={() => setIsExpanded(!isExpanded)}>{isExpanded ? 'Show Less' : 'Show More'}</ExpandButton>
    </AFDContainer>
  );
};

export default AFD;
