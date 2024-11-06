import React from 'react';
import styled from 'styled-components';

const ModelContainer = styled.div`
  background-color: ${(props) => props.theme.colors.backgroundLight};
  //   padding: 10px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ModelImage = styled.img`
  width: 100%;
  height: auto;
  //   border-radius: 5px;
`;

interface CDIPClassicSwellModelProps {
  latitude: number;
  longitude: number;
}

const CDIPClassicSwellModel: React.FC<CDIPClassicSwellModelProps> = ({ latitude, longitude }) => {
  const getModelImage = (lat: number, lon: number): string => {
    // Southern California Bight (approximately)
    if (lat >= 32.0 && lat <= 34.5 && lon >= -121.0 && lon <= -116.0) {
      return 'https://cdip.ucsd.edu/recent/model_images/socal_now.png';
    }

    // Central Coast (approximately)
    if (lat > 34.5 && lat <= 36.0 && lon >= -122 && lon <= -119.0) {
      return 'https://cdip.ucsd.edu/recent/model_images/conception.png';
    }

    // Monterey Bay (Pt. Ano Nuevo to Pt. Sur)
    if (lat > 36.0 && lat <= 37.2 && lon >= -123.0 && lon <= -120.0) {
      return 'https://cdip.ucsd.edu/recent/model_images/monterey.png';
    }

    // San Francisco (Pt. Arena to Half Moon Bay)
    if (lat > 37.2 && lat <= 39.0 && lon >= -124.0 && lon <= -121.0) {
      return 'https://cdip.ucsd.edu/recent/model_images/sf.png';
    }

    return ''; // Return empty string if not in any region
  };

  const modelUrl = getModelImage(latitude, longitude);

  if (!modelUrl) {
    return null; // Don't render anything if not in a supported region
  }

  return (
    <ModelContainer>
      <ModelImage src={modelUrl} alt="CDIP Classic Swell Model" />
    </ModelContainer>
  );
};

export default CDIPClassicSwellModel;
