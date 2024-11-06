import React from 'react';
import styled from 'styled-components';

const ModelContainer = styled.div`
  background-color: ${(props) => props.theme.colors.backgroundLight};
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ModelImage = styled.img`
  width: 100%;
  height: auto;
`;

interface CDIPClassicSwellModelLocalProps {
  latitude: number;
  longitude: number;
}

const CDIPClassicSwellModelLocal: React.FC<CDIPClassicSwellModelLocalProps> = ({ latitude, longitude }) => {
  const isInSanDiegoCounty = (lat: number, lon: number): boolean => {
    // San Diego County boundaries (approximate)
    return (
      lat >= 32.5 && // Mexican border
      lat <= 33.5 && // Camp Pendleton
      lon >= -117.6 && // Coast
      lon <= -116.1 // Eastern border
    );
  };

  if (!isInSanDiegoCounty(latitude, longitude)) {
    return null; // Don't render anything if not in San Diego County
  }

  return (
    <ModelContainer>
      <ModelImage src="http://cdip.ucsd.edu/recent/model_images/san_diego.png" alt="CDIP San Diego Swell Model" />
    </ModelContainer>
  );
};

export default CDIPClassicSwellModelLocal;
