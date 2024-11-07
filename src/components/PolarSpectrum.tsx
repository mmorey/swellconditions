import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { NDBCStation } from '../APIClients/NDBCTypes';

const CanvasContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 10px 0;
`;

const Canvas = styled.canvas`
  max-width: 100%;
  height: auto;
`;

const Title = styled.div`
  font-size: 12px;
  text-align: center;
  margin-bottom: 5px;
  color: ${(props) => props.theme.colors.text.primary};
`;

interface PolarSpectrumProps {
  station: NDBCStation;
}

const PolarSpectrum: React.FC<PolarSpectrumProps> = ({ station }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !station.spectralWaveData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const size = 400;
    canvas.width = size;
    canvas.height = size;
    const center = size / 2;
    const radius = size / 2 - 40; // Leave space for labels

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, size, size);

    // Create gradient map for spectrum
    const createColorGradient = (value: number) => {
      // value should be between 0 and 1
      const hue =
        value < 0.5
          ? 240 // Blue for low values
          : 240 - (value - 0.5) * 480; // Transition to red for high values
      const saturation = 100;
      const lightness = 30 + value * 20; // Brighter for higher values
      return `hsla(${hue}, ${saturation}%, ${lightness}%, ${value * 0.8 + 0.2})`;
    };

    // Draw grid circles and labels
    const periodRings = [8, 12, 16, 20, 24];
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'center';
    ctx.font = '10px Arial';

    periodRings.forEach((period) => {
      const circleRadius = (radius * (period - 8)) / 16; // Adjust scale to start at 8s
      ctx.beginPath();
      ctx.arc(center, center, circleRadius, 0, 2 * Math.PI);
      ctx.stroke();
      // Add period label
      ctx.fillText(`${period}s`, center, center - circleRadius);
    });

    // Draw angle markers
    const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    ctx.textAlign = 'center';
    angles.forEach((angle) => {
      const radian = ((angle - 90) * Math.PI) / 180;
      // Draw line
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + radius * Math.cos(radian), center + radius * Math.sin(radian));
      ctx.stroke();
      // Add angle label
      const labelRadius = radius + 20;
      ctx.fillText(`${angle}°`, center + labelRadius * Math.cos(radian), center + labelRadius * Math.sin(radian));
    });

    // Filter data points for swell periods (>= 8 seconds)
    const swellData = station.spectralWaveData.spectralData.filter((p) => 1 / p.frequency >= 8);
    const maxEnergy = Math.max(...swellData.map((p) => p.energy));

    // Create 2D spectrum using interpolation
    const resolution = 360; // Number of points around the circle
    const angleStep = (2 * Math.PI) / resolution;

    // Create interpolated data points
    for (let angle = 0; angle < 2 * Math.PI; angle += angleStep) {
      const points = swellData.filter((p) => Math.abs((p.angle * Math.PI) / 180 - (90 * Math.PI) / 180 - angle) < Math.PI / 4);

      if (points.length === 0) continue;

      // For each radius (period), starting at 8 seconds
      for (let period = 8; period <= 24; period += 0.5) {
        const relevantPoints = points.filter((p) => Math.abs(1 / p.frequency - period) < 2);

        if (relevantPoints.length === 0) continue;

        // Calculate interpolated energy
        const totalEnergy =
          relevantPoints.reduce((sum, point) => {
            const periodDiff = Math.abs(1 / point.frequency - period);
            const angleDiff = Math.abs((point.angle * Math.PI) / 180 - (90 * Math.PI) / 180 - angle);
            const weight = 1 / (1 + periodDiff * 2 + angleDiff * 2);
            return sum + point.energy * weight;
          }, 0) / relevantPoints.length;

        const normalizedEnergy = totalEnergy / maxEnergy;
        if (normalizedEnergy < 0.01) continue;

        const normalizedRadius = (radius * (period - 8)) / 16; // Adjust scale to start at 8s
        const x = center + normalizedRadius * Math.cos(angle);
        const y = center + normalizedRadius * Math.sin(angle);

        // Draw spectrum point with gradient color
        ctx.fillStyle = createColorGradient(normalizedEnergy);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // Add center label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('Period', center, center);
    ctx.fillText('range:', center, center + 15);
    ctx.fillText('8-24 sec', center, center + 30);
  }, [station]);

  if (!station.spectralWaveData) return null;

  return (
    <CanvasContainer>
      <Title>Wave Energy Spectrum - Station {station.id}</Title>
      <Canvas ref={canvasRef} />
    </CanvasContainer>
  );
};

export default PolarSpectrum;
