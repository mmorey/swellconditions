import React from 'react';
import styled from 'styled-components';

const LocationInputContainer = styled.div`
  background-color: ${(props) => props.theme.colors.backgroundLight};
  padding: 10px;
  border-radius: 10px;
`;

const Description = styled.div`
  text-align: center;
  margin: 20px 0;
  line-height: 1.5;
  color: ${(props) => props.theme.colors.text.primary};
`;

const CoordinateInputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  padding: 20px;
`;

const InputRow = styled.div`
  display: flex;
  gap: 10px;
  width: 100%;
  max-width: 600px;
  justify-content: center;
`;

const Input = styled.input`
  padding: 8px;
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 4px;
  background-color: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.text.primary};
  width: 120px;
`;

const Button = styled.button`
  padding: 8px 16px;
  background-color: ${(props) => props.theme.colors.link.primary};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
`;

const ErrorInfo = styled.div`
  margin: 10px;
  padding: 10px;
  background-color: ${(props) => props.theme.colors.text.error};
  border-radius: 5px;
  font-size: 14px;
  text-align: center;
`;

const LocationsList = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin: 10px 0;
`;

const LocationButton = styled(Button)`
  font-size: 14px;
  padding: 6px 12px;
`;

interface LocationInputProps {
  manualLat: string;
  manualLon: string;
  locationError: string | null;
  isGettingLocation: boolean;
  onLatChange: (value: string) => void;
  onLonChange: (value: string) => void;
  onSubmitCoordinates: () => void;
  onUseLocation: () => void;
}

const LocationInput: React.FC<LocationInputProps> = ({ manualLat, manualLon, locationError, isGettingLocation, onLatChange, onLonChange, onSubmitCoordinates, onUseLocation }) => {
  const popularLocations = [
    { name: 'Montauk', lat: 41.0375, lon: -71.9112, ndbc: ['44011', '44097', '44025'] }, // 41.037530, -71.911183
    { name: 'New Smyrna Beach', lat: 29.071, lon: -80.9089, ndbc: ['41002', '41010', '41070'] }, //29.070984, -80.908929
    { name: 'Malibu', lat: 34.0259, lon: -118.7798, ndbc: ['46232', '46221', '46268'] },
    { name: 'Lower Trestles', lat: 33.382, lon: -117.5886, ndbc: ['46232', '46086', '46275'] }, //33.382040, -117.588630
    { name: 'Blacks', lat: 32.8786, lon: -117.253, ndbc: ['46232', '46225', '46254'] }, //32.878588, -117.252951
    { name: 'Pipeline', lat: 21.6654, lon: -158.0521, ndbc: ['51001', '51208', '51201'] },
  ];

  const handleLocationSelect = (name: string, lat: number, lon: number, ndbc?: string[]) => {
    if (ndbc) {
      // comma separated list of NDBC stations
      window.location.href = `?name=${name}&lat=${lat}&lon=${lon}&ndbc=${ndbc.join(',')}`;
    } else {
      window.location.href = `?name=${name}&lat=${lat}&lon=${lon}`;
    }
  };

  return (
    <LocationInputContainer>
      <Description>
        <p>SwellConditions.com provides relevant surf conditions for coastal USA locations. To provide you with accurate local conditions, we need your location coordinates.</p>
        <p>The simplest way to get started is to click "Use My Location" below, which will automatically detect your location.</p>
      </Description>

      <CoordinateInputGroup>
        <Button onClick={onUseLocation} disabled={isGettingLocation}>
          {isGettingLocation ? 'Getting Location...' : '⌖ Use My Location'}
        </Button>
        <Description>
          <p>Alternatively, you can manually enter specific latitude and longitude coordinates.</p>
        </Description>
        <InputRow>
          <Input type="number" step="any" placeholder="Latitude" value={manualLat} onChange={(e) => onLatChange(e.target.value)} />
          <Input type="number" step="any" placeholder="Longitude" value={manualLon} onChange={(e) => onLonChange(e.target.value)} />
          <Button onClick={onSubmitCoordinates}>Submit Coordinates</Button>
        </InputRow>
        {locationError && <ErrorInfo>{locationError}</ErrorInfo>}
      </CoordinateInputGroup>
      <Description>
        <p>Or here are some popular locations:</p>
        <LocationsList>
          {popularLocations.map((location) => (
            <LocationButton key={location.name} onClick={() => handleLocationSelect(location.name, location.lat, location.lon, location.ndbc)}>
              {location.name}
            </LocationButton>
          ))}
        </LocationsList>
      </Description>
    </LocationInputContainer>
  );
};

export default LocationInput;
