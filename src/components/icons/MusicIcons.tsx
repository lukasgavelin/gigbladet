import React from 'react';

export interface MusicIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
  weight?: 'regular' | 'bold' | 'duotone' | 'thin';
}

/**
 * Custom Metronome icon designed for GigBladet.
 * Features a classic triangular wooden casing, swinging pendulum, and sliding tempo weight.
 * Supports Phosphor-compatible duotone weighting with soft body tint.
 */
export const MetronomeIcon: React.FC<MusicIconProps> = ({
  className = 'w-4 h-4',
  size = 16,
  weight = 'duotone',
  ...props
}) => {
  const isDuotone = weight === 'duotone';
  const strokeW = weight === 'bold' ? 2.5 : weight === 'thin' ? 1.25 : 1.75;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeW}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      {/* Duotone Body Fill */}
      {isDuotone && (
        <path
          d="M7 21h10l-3.5-16h-3L7 21z"
          fill="currentColor"
          opacity="0.2"
          stroke="none"
        />
      )}
      {/* Metronome Casing */}
      <path d="M7 21h10l-3.5-16h-3L7 21z" />
      {/* Base Feet */}
      <path d="M5 21h14" />
      {/* Pendulum / Ticker Arm */}
      <path d="M12 18l4-11" />
      {/* Weight Slider */}
      <circle cx="15.2" cy="9.2" r="1.5" fill="currentColor" />
    </svg>
  );
};

/**
 * Custom Pitch Pipe / Tuning Fork (Stämpipa) icon for GigBladet.
 * Represents pitch, acoustic tone reference, and vocal tuning.
 */
export const PitchPipeIcon: React.FC<MusicIconProps> = ({
  className = 'w-4 h-4',
  size = 16,
  weight = 'duotone',
  ...props
}) => {
  const isDuotone = weight === 'duotone';
  const strokeW = weight === 'bold' ? 2.5 : weight === 'thin' ? 1.25 : 1.75;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeW}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      {/* Duotone Tone Chamber Fill */}
      {isDuotone && (
        <path
          d="M8 3v7a4 4 0 0 0 8 0V3z"
          fill="currentColor"
          opacity="0.2"
          stroke="none"
        />
      )}
      {/* Fork Prongs */}
      <path d="M8 3v7a4 4 0 0 0 8 0V3" />
      {/* Stem & Handle */}
      <path d="M12 14v7" />
      <circle cx="12" cy="21" r="1.2" fill="currentColor" />
      {/* Acoustic waves */}
      <path d="M5 6a7 7 0 0 0 0 8" opacity="0.6" strokeDasharray="1 2" />
      <path d="M19 6a7 7 0 0 1 0 8" opacity="0.6" strokeDasharray="1 2" />
    </svg>
  );
};

/**
 * Animated Sound Wave icon indicating active pitch tone playback.
 */
export const SoundWaveIcon: React.FC<MusicIconProps> = ({
  className = 'w-3.5 h-3.5',
  size = 14,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <path d="M2 10v4" />
    <path d="M6 7v10" />
    <path d="M10 4v16" />
    <path d="M14 7v10" />
    <path d="M18 9v6" />
    <path d="M22 11v2" />
  </svg>
);
