declare module 'otp-input-react' {
  interface OTPInputProps {
    value: string;
    onChange: (value: string) => void;
    autoFocus?: boolean;
    OTPLength?: number;
    otpType?: 'number' | 'text' | 'password';
    disabled?: boolean;
    inputClassName?: string;
    inputStyles?: React.CSSProperties;
    secure?: boolean;
    renderInput?: (props: React.InputHTMLAttributes<HTMLInputElement>) => JSX.Element;
  }

  const OTPInput: React.FC<OTPInputProps>;
  export default OTPInput;
} 