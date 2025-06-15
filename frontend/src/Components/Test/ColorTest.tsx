import React from 'react';
import { Button, Input } from '../Common';
import './ColorTest.scss';

const ColorTest: React.FC = () => {
  return (
    <div className="color-test-page">
      <div className="color-test-container">
        <h1>Color Scheme Test</h1>
        <p>Testing Update Profile color combination across components</p>
        
        {/* Card Example */}
        <div className="test-card">
          <h3>Test Card</h3>
          <p>This card uses --sub-card-bg and --sub-border</p>
          
          <div className="form-section">
            <Input
              label="Test Input"
              type="text"
              placeholder="Enter some text"
              hint="This input uses Update Profile styling"
              fullWidth
            />
            
            <Input
              label="Email Input"
              type="email"
              placeholder="test@example.com"
              fullWidth
            />
            
            <Input
              label="Error Input"
              type="text"
              error="This is an error message"
              fullWidth
            />
          </div>
          
          <div className="button-section">
            <Button variant="primary" size="md">
              Primary Button
            </Button>
            
            <Button variant="gradient" size="md">
              Gradient Button
            </Button>
            
            <Button variant="secondary" size="md">
              Secondary Button
            </Button>
            
            <Button variant="ghost" size="md">
              Ghost Button
            </Button>
          </div>
          
          <div className="button-section">
            <Button variant="primary" size="lg" fullWidth>
              Full Width Primary
            </Button>
            
            <Button variant="gradient" size="lg" fullWidth loading>
              Loading Button
            </Button>
          </div>
        </div>
        
        {/* Color Variables Display */}
        <div className="color-variables">
          <h3>Current Color Variables</h3>
          <div className="color-grid">
            <div className="color-item">
              <div className="color-box" style={{ backgroundColor: 'var(--sub-bg)' }}></div>
              <span>--sub-bg</span>
            </div>
            <div className="color-item">
              <div className="color-box" style={{ backgroundColor: 'var(--sub-card-bg)' }}></div>
              <span>--sub-card-bg</span>
            </div>
            <div className="color-item">
              <div className="color-box" style={{ backgroundColor: 'var(--sub-accent)' }}></div>
              <span>--sub-accent</span>
            </div>
            <div className="color-item">
              <div className="color-box" style={{ backgroundColor: 'var(--sub-text)' }}></div>
              <span>--sub-text</span>
            </div>
            <div className="color-item">
              <div className="color-box" style={{ backgroundColor: 'var(--sub-text-secondary)' }}></div>
              <span>--sub-text-secondary</span>
            </div>
            <div className="color-item">
              <div className="color-box" style={{ backgroundColor: 'var(--sub-border)' }}></div>
              <span>--sub-border</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorTest;
