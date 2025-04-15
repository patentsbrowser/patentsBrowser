import { useQuery } from '@tanstack/react-query';
import './ProfilePage.scss';
import { authApi } from '../../api/auth';
import { useNavigate } from 'react-router-dom';
import { Country, ICountry } from 'country-state-city';
import { useEffect, useState } from 'react';

// Helper function to get country flag emoji from country code
const getCountryFlagEmoji = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const [countries, setCountries] = useState<ICountry[]>([]);
  
  // Load countries on component mount
  useEffect(() => {
    setCountries(Country.getAllCountries());
  }, []);
  
  // Use useQuery instead of useMutation for fetching data
  const { data: profileResponse, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: authApi.getProfile
  });

  const profileData = profileResponse?.data;
  console.log(profileData);

  // Format phone number with country code if available
  const formatPhoneNumber = (number?: string, phoneCode?: string) => {
    if (!number) return "No Record";
    if (phoneCode) return `+${phoneCode} ${number}`;
    return number;
  };

  // Format payment status for display
  const formatPaymentStatus = (status?: string) => {
    if (!status) return "Free Trial";
    return status === 'paid' ? "Paid Version" : "Free Trial";
  };

  const formatGender = (gender?: string) => {
    if (!gender) return "Not specified";
    switch(gender) {
      case 'male': return "Male";
      case 'female': return "Female";
      case 'prefer_not_to_say': return "Prefer not to say";
      default: return gender;
    }
  };

  const profile = {
    name: profileData?.name || "No Record",
    email: profileData?.email || "No Record",
    number: formatPhoneNumber(profileData?.number, profileData?.phoneCode),
    address: profileData?.address || "No Record",
    paymentStatus: formatPaymentStatus(profileData?.subscriptionStatus),
    gender: formatGender(profileData?.gender),
    nationality: profileData?.nationality || "No Record",
    imageUrl: profileData?.imageUrl || undefined
  };

  // Find country object by name to get the ISO code for the flag
  const getCountryByName = (countryName: string): ICountry | undefined => {
    return countries.find(country => country.name === countryName);
  };

  if (isLoading) {
    return <div className="profile-page loading">Loading profile data...</div>;
  }

  if (error) {
    return <div className="profile-page error">Error loading profile data</div>;
  }

  const handleImageClick = () => {
    document.getElementById('profile-image-input')?.click();
  };

  // Get country object and flag emoji
  const country = getCountryByName(profile.nationality);
  const flagEmoji = country ? getCountryFlagEmoji(country.isoCode) : '';

  return (
    <div className="profile-page">
      <h2>Profile</h2>
      
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-image-container" onClick={handleImageClick}>
            {profile.imageUrl ? (
              <img 
                src={`http://localhost:5000${profile.imageUrl}`} 
                alt="Profile" 
                className="profile-image" 
              />
            ) : (
              <div className="profile-image-placeholder">
                <span>{profile.name?.charAt(0)}</span>
                <div className="image-upload-icon">📷</div>
              </div>
            )}
          </div>
          <div className="profile-info-header">
            <h3>{profile.name}</h3>
            <span className={`payment-status ${profile.paymentStatus === "Paid Version" ? 'paid' : 'free'}`}>
              {profile.paymentStatus}
            </span>
          </div>
        </div>
        
        <div className="profile-details">
          <div className="detail-item">
            <div className="detail-label">Email</div>
            <div className="detail-value">{profile.email}</div>
          </div>
          
          <div className="detail-item">
            <div className="detail-label">Phone Number</div>
            <div className="detail-value">{profile.number}</div>
          </div>
          
          <div className="detail-item">
            <div className="detail-label">Address</div>
            <div className="detail-value">{profile.address}</div>
          </div>
          
          
          <div className="detail-item">
            <div className="detail-label">Gender</div>
            <div className="detail-value">{profile.gender}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Nationality</div>
            <div className="detail-value">
              {profile.nationality}
              {flagEmoji && (
                <span className="flag-icon">{flagEmoji}</span>
              )}
            </div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Subscription</div>
            <div className="detail-value status-value">
              <span className={`payment-status small ${profile.paymentStatus === "Paid Version" ? 'paid' : 'free'}`}>
                {profile.paymentStatus}
              </span>
            </div>
          </div>
        </div>     
        
        <div className="profile-actions">
          <button 
            className="edit-profile-btn" 
            onClick={() => navigate('/auth/update-profile')}
          >
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 