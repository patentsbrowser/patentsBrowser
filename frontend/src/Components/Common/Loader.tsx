import './Loader.scss';

interface LoaderProps {
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  text?: string;
}

const Loader = ({ size = 'medium', fullScreen = false, text }: LoaderProps) => {
  const loaderClasses = `loader ${size} ${fullScreen ? 'fullscreen' : ''}`;
  
  return (
    <div className={loaderClasses}>
      <div className="spinner"></div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default Loader; 