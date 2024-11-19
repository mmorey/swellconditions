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
    color: ${(props) => props.theme.colors.text.primary};
    margin: 0.5rem 0;
    line-height: 1.5;
    font-size: 0.9rem;
  }

  ul {
    margin: 0.5rem 0;
    padding-left: 2rem;
    font-size: 0.9rem;
    line-height: 1.5;
    color: ${(props) => props.theme.colors.text.primary};
  }

  .warning {
    color: #d32f2f;
    font-weight: bold;
    margin: 0.5rem 0;
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

  .synopsis {
    margin: 1rem 0;
    padding: 0.5rem;
    background-color: ${(props) => props.theme.colors.backgroundDark};
    border-radius: 4px;
  }

  .location {
    font-weight: bold;
    color: ${(props) => props.theme.colors.text.secondary};
  }

  .forecast-date {
    color: ${(props) => props.theme.colors.text.secondary};
    font-size: 0.8rem;
  }

  .sub-forecast {
    margin: 0.5rem 0;
    padding-left: 1rem;
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

interface SubForecast {
  timeframe: string;
  forecast_text: string;
}

interface ForecastSection {
  code: string;
  location: string;
  forecast_date: string;
  is_updated: boolean;
  advisories: string[];
  sub_forecasts: SubForecast[];
  raw: string;
}

interface ParsedCWF {
  preamble: string;
  synopsis: string;
  forecasts: ForecastSection[];
}

interface CWFProps {
  cwf: string;
  wfo: string;
  timestamp: string;
  simpleFormat?: boolean;
}

const getSynopsis = (text: string): string => {
  const synopsisMatch = text.match(/synopsis([\s\S]*?)\$\$/i);
  if (!synopsisMatch) return '';

  let synopsis = synopsisMatch[1];
  const parts = synopsis.split('...');

  if (parts.length > 1) {
    synopsis = parts.slice(1).join('...');
  } else {
    const lines = synopsis.split('\n');
    if (lines.length > 1) {
      synopsis = lines.slice(1).join(' ');
    }
  }

  return synopsis.replace(/\n/g, ' ').trim();
};

const parseForecastSection = (section: string): ForecastSection | null => {
  const lines = section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line);
  if (lines.length === 0) return null;

  const result: ForecastSection = {
    code: '',
    location: '',
    forecast_date: '',
    is_updated: false,
    advisories: [],
    sub_forecasts: [],
    raw: section,
  };

  let currentIndex = 0;
  let codeLines = [];

  // Parse code
  while (currentIndex < lines.length && !lines[currentIndex].endsWith('-')) {
    codeLines.push(lines[currentIndex].replace(/-$/, '').trim());
    currentIndex++;
  }
  if (currentIndex < lines.length) {
    codeLines.push(lines[currentIndex].replace(/-$/, '').trim());
    currentIndex++;
  }
  result.code = codeLines.join(' ');

  // Parse location
  let locationLines = [];
  while (currentIndex < lines.length && !lines[currentIndex].endsWith('-')) {
    locationLines.push(lines[currentIndex].replace(/-$/, '').trim());
    currentIndex++;
  }
  if (currentIndex < lines.length) {
    locationLines.push(lines[currentIndex].replace(/-$/, '').trim());
    currentIndex++;
  }
  result.location = locationLines.join(' ');

  // Parse forecast date
  if (currentIndex < lines.length) {
    result.forecast_date = lines[currentIndex];
    currentIndex++;
  }

  // Check for UPDATED flag
  if (currentIndex < lines.length && lines[currentIndex] === 'UPDATED') {
    result.is_updated = true;
    currentIndex++;
  }

  // Parse remaining content
  let currentAdvisory: string[] = [];
  let currentSubForecast: SubForecast | null = null;

  while (currentIndex < lines.length) {
    const line = lines[currentIndex];

    // Handle advisories
    if (line.startsWith('...')) {
      if (currentAdvisory.length > 0 && line.endsWith('...')) {
        currentAdvisory.push(line.replace(/\.\.\./g, '').trim());
        result.advisories.push(currentAdvisory.join(' '));
        currentAdvisory = [];
      } else {
        currentAdvisory.push(line.replace(/\.\.\./g, '').trim());
      }
    }
    // Handle sub-forecasts
    else if (line.startsWith('.')) {
      const parts = line.substring(1).split('...');
      if (parts.length === 2) {
        if (currentSubForecast) {
          result.sub_forecasts.push(currentSubForecast);
        }
        currentSubForecast = {
          timeframe: parts[0].trim(),
          forecast_text: parts[1].trim(),
        };
      } else if (currentSubForecast) {
        currentSubForecast.forecast_text += ' ' + line.trim();
      }
    }
    // Add to current sub-forecast if exists
    else if (currentSubForecast) {
      currentSubForecast.forecast_text += ' ' + line.trim();
    }

    currentIndex++;
  }

  // Add final sub-forecast if exists
  if (currentSubForecast) {
    result.sub_forecasts.push(currentSubForecast);
  }

  return result;
};

const parseCWF = (text: string): ParsedCWF => {
  // Remove carriage returns and get initial lines
  const cleanText = text.replace(/\r/g, '');

  // Split into main sections
  const sections = cleanText.split('$$');

  // Get preamble (first section)
  const preamble = sections[0]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && line !== '000')
    .join('\n');

  // Get synopsis
  const synopsis = getSynopsis(cleanText);

  // Parse forecast sections
  const forecasts = sections
    .slice(1)
    .map((section) => parseForecastSection(section))
    .filter((section): section is ForecastSection => section !== null);

  return {
    preamble,
    synopsis,
    forecasts,
  };
};

const CWF: React.FC<CWFProps> = ({ cwf, wfo, timestamp, simpleFormat = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formattedContent, setFormattedContent] = useState<JSX.Element | null>(null);

  useEffect(() => {
    const formatCWF = () => {
      // If simpleFormat is true, just wrap in pre tag
      if (simpleFormat) {
        const cleanedText = cwf.replace(/\r/g, '').split('\n').slice(8).join('\n');
        setFormattedContent(<pre>{cleanedText}</pre>);
        return;
      }

      const parsed = parseCWF(cwf);

      const content = (
        <div>
          {parsed.synopsis && (
            <div className="synopsis">
              <strong>Synopsis: </strong>
              {parsed.synopsis}
            </div>
          )}

          {parsed.forecasts.map((forecast, index) => (
            <div key={index}>
              <div className="location">{forecast.location}</div>
              <div className="forecast-date">{forecast.forecast_date}</div>

              {forecast.is_updated && (
                <p>
                  <em>Updated</em>
                </p>
              )}

              {forecast.advisories.map((advisory, idx) => (
                <p key={idx} className="warning">
                  {advisory}
                </p>
              ))}

              {forecast.sub_forecasts.map((subForecast, idx) => (
                <div key={idx} className="sub-forecast">
                  <h3>{subForecast.timeframe}</h3>
                  <p>{subForecast.forecast_text}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      );

      setFormattedContent(content);
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
