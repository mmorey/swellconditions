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
    return (
      lat >= 32.5 && // Mexican border
      lat <= 33.5 && // Camp Pendleton
      lon >= -117.6 && // Coast
      lon <= -116.1 // Eastern border
    );
  };

  const isInOrangeCounty = (lat: number, lon: number): boolean => {
    return (
      lat >= 33.5 && // South border
      lat <= 33.95 && // North border
      lon >= -118.0 && // Coast
      lon <= -117.4 // Eastern border
    );
  };

  const isInLosAngelesCounty = (lat: number, lon: number): boolean => {
    return (
      lat >= 33.7 && // South border
      lat <= 34.8 && // North border
      lon >= -118.7 && // Coast
      lon <= -117.6 // Eastern border
    );
  };

  const isInVenturaOrSantaBarbaraCounty = (lat: number, lon: number): boolean => {
    return (
      lat >= 34.0 && // South border
      lat <= 35.0 && // North border
      lon >= -120.5 && // Coast
      lon <= -118.7 // Eastern border
    );
  };

  const isInSanFranciscoBayArea = (lat: number, lon: number): boolean => {
    return (
      lat >= 37.2 && // South border
      lat <= 38.0 && // North border
      lon >= -122.7 && // Coast
      lon <= -121.8 // Eastern border
    );
  };

  const getModelImageUrl = (lat: number, lon: number): string | null => {
    if (isInSanDiegoCounty(lat, lon)) {
      return 'http://cdip.ucsd.edu/recent/model_images/san_diego.png';
    }
    if (isInOrangeCounty(lat, lon)) {
      return 'http://cdip.ucsd.edu/recent/model_images/san_pedro.png';
    }
    if (isInLosAngelesCounty(lat, lon)) {
      return 'http://cdip.ucsd.edu/recent/model_images/santa_monica.png';
    }
    if (isInVenturaOrSantaBarbaraCounty(lat, lon)) {
      return 'http://cdip.ucsd.edu/recent/model_images/sb_channel.png';
    }
    if (isInSanFranciscoBayArea(lat, lon)) {
      return 'http://cdip.ucsd.edu/recent/model_images/gg.png';
    }
    return null;
  };

  const modelImageUrl = getModelImageUrl(latitude, longitude);

  if (!modelImageUrl) {
    return null; // Don't render anything if not in a supported region
  }

  return (
    <ModelContainer>
      <ModelImage src={modelImageUrl} alt="CDIP Local Swell Model" />
    </ModelContainer>
  );
};

export default CDIPClassicSwellModelLocal;
