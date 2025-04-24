import GoogleLogin from './GoogleLogin';

// ... existing code ...

return (
    <div className="auth-container">
        {/* ... existing form elements ... */}
        
        <div className="auth-divider">
            <span>Or</span>
        </div>
        
        <div className="social-login">
            <GoogleLogin onSuccess={() => {
                // You can add additional logic here if needed
            }} />
        </div>
    </div>
); 