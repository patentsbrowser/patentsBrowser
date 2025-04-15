import React, { useState, useEffect, useRef } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import './UpdateProfile.scss';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Country, ICountry } from 'country-state-city';
// Import the phone input component and helper functions
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { parsePhoneNumber } from 'libphonenumber-js';

// Helper function to get country flag emoji from country code
const getCountryFlagEmoji = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Format payment status for display
const formatPaymentStatus = (status?: string) => {
  if (!status) return "Free Trial";
  
  switch(status) {
    case 'active':
      return "Paid Subscription";
    case 'pending':
      return "Payment Pending";
    case 'trial':
      return "Free Trial";
    case 'expired':
      return "Expired";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

const UpdateProfile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [profileUrl, setProfileUrl] = useState<string | undefined>(undefined);
  const [countries, setCountries] = useState<ICountry[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<ICountry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Add phoneValue state for PhoneInput
  const [phoneValue, setPhoneValue] = useState<string>('');
  // Add payment status state
  const [paymentStatus, setPaymentStatus] = useState<string>('free');

  // Load countries on component mount
  useEffect(() => {
    const allCountries = Country.getAllCountries();
    // Sort countries alphabetically by name
    allCountries.sort((a, b) => a.name.localeCompare(b.name));
    setCountries(allCountries);
  }, []);

  // Handle clicking outside of dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // First, fetch the current profile data
  const { data: profileResponse, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: authApi.getProfile
  });

  const profile = profileResponse?.statusCode === 200 ? profileResponse.data : null;

  // When profile data loads, set the selected country and phone value
  useEffect(() => {
    if (profile?.nationality) {
      const country = countries.find(c => c.name === profile.nationality);
      if (country) {
        setSelectedCountry(country);
      }
    }
    
    // Set phone value if it exists
    if (profile?.number) {
      // If phoneCode exists, format the phone number with the country code
      if (profile?.phoneCode) {
        setPhoneValue(`+${profile.phoneCode}${profile.number}`);
      } else {
        setPhoneValue(profile.number);
      }
    }

    // Set payment status if it exists
    if (profile?.subscriptionStatus) {
      setPaymentStatus(profile.subscriptionStatus);
    }
    
    // Set profile image URL if it exists
    if (profile?.imageUrl) {
      setProfileUrl(profile.imageUrl);
    }
  }, [profile?.nationality, profile?.number, profile?.phoneCode, profile?.subscriptionStatus, profile?.imageUrl, countries]);

  // Add this mutation for image upload
  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => authApi.uploadProfileImage(file),
    onSuccess: (data) => {
      if (data.statusCode === 200) {
        setProfileUrl(data.data.imageUrl);
        formik.setFieldValue('imageUrl', data.data.imageUrl);
        // Don't update Redux store or invalidate queries here
        // Just store the image URL for form submission
      } else {
        toast.error(data.message || 'Failed to upload image');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload image');
    }
  });

  // Set up mutation for updating profile
  const updateProfileMutation = useMutation({
    mutationFn: (values: any) => {
      // If phoneValue exists, parse it to separate country code and national number
      if (phoneValue) {
        try {
          const phoneNumber = parsePhoneNumber(phoneValue);
          if (phoneNumber) {
            // Replace the number with country code and national number separately
            values.phoneCode = phoneNumber.countryCallingCode;
            values.number = phoneNumber.nationalNumber;
          }
        } catch (error) {
          console.error('Failed to parse phone number:', error);
        }
      }
      // Preserve the existing payment status
      values.subscriptionStatus = paymentStatus;
      return authApi.updateProfile(values);
    },
    onSuccess: (data) => {
      if (data.statusCode === 200) {
        toast.success(data.message || 'Profile updated successfully!');
        
        // Update the Redux store with all profile data including the image URL
        queryClient.setQueryData(['profile'], (oldData: any) => {
          const updatedProfile = data.data || {};
          return {
            ...oldData,
            data: {
              ...oldData?.data,
              ...updatedProfile,
              // Ensure imageUrl is preserved if not changed
              imageUrl: updatedProfile.imageUrl || oldData?.data?.imageUrl
            }
          };
        });
        
        // Now invalidate profile query to refetch with updated data
        // This will update the header with the new image
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        
        // Navigate with state to inform header to update
        navigate('/auth/profile', { state: { fromUpdateProfile: true }});
      } else {
        toast.error(data.message || 'Something went wrong');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  });

  const formik = useFormik({
    initialValues: {
      name: profile?.name || '',
      email: profile?.email || '',
      number: profile?.number || '',
      nationality: profile?.nationality || '',
      address: profile?.address || '',
      gender: profile?.gender || 'prefer_not_to_say',
      imageUrl: profile?.imageUrl || profileUrl,
      paymentStatus: paymentStatus,
    },
    enableReinitialize: true, // Important: update form when profile data loads
    validationSchema: Yup.object({
      name: Yup.string()
        .required('Name is required'),
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
      nationality: Yup.string()
        .required('Nationality is required'),
      address: Yup.string()
        .required('Address is required'),
      gender: Yup.string()
        .oneOf(['male', 'female', 'prefer_not_to_say'], 'Please select a valid gender option')
        .required('Gender is required'),
    }),
    onSubmit: (values) => {
      updateProfileMutation.mutate(values);
    },
  });

  const handleImageClick = () => {
    document.getElementById('profileImageInput')?.click();
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files && event.currentTarget.files[0]) {
      const file = event.currentTarget.files[0];
      setPreviewImage(URL.createObjectURL(file));
      uploadImageMutation.mutate(file);
    }
  };

  // Filter countries based on search term
  const filteredCountries = searchTerm
    ? countries.filter(country => 
        country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCountryFlagEmoji(country.isoCode).includes(searchTerm)
      )
    : countries;

  const handleCountryClick = (country: ICountry) => {
    setSelectedCountry(country);
    formik.setFieldValue('nationality', country.name);
    setShowDropdown(false);
    setSearchTerm('');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Open dropdown when clicking on the input
  const handleInputClick = () => {
    setShowDropdown(true);
    // Focus the search input when dropdown opens
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 0);
  };

  if (profileLoading) {
    return <div className="update-profile loading">Loading profile data...</div>;
  }
  console.log('formik.values.imageUrl', formik.values.imageUrl,profile?.imageUrl)
  

  return (
    <div className="update-profile">
      <h2>Update Profile</h2>
      
      <form onSubmit={formik.handleSubmit}>
        <div className="profile-image-container" onClick={handleImageClick}>
          {previewImage ? (
            <img 
              src={previewImage} 
              alt="Profile Preview" 
              className="profile-image" 
            />
          ) : profile?.imageUrl || formik.values.imageUrl ? (
            <img 
              src={`http://localhost:5000${profile?.imageUrl || formik.values.imageUrl}`} 
              alt="Profile" 
              className="profile-image" 
            />
          ) : (
            <div className="profile-image-placeholder">
              <span>{formik.values.name?.charAt(0)}</span>
              <div className="image-upload-icon">📷</div>
            </div>
          )}
          <input
            type="file"
            id="profileImageInput"
            accept="image/*"
            onChange={handleImageChange}
            style={{ display: 'none' }}
          />
        </div>
        
        {/* Display current subscription status */}
        <div className="subscription-banner">
          <span className="subscription-label">Current Subscription:</span>
          <span className={`payment-status ${
            paymentStatus === 'active' ? 'paid' : 
            paymentStatus === 'pending' ? 'pending' : 'free'
          }`}>
            {formatPaymentStatus(paymentStatus)}
          </span>
        </div>
        
        <div className="form-fields">
          <label>
            Name
            <input
              type="text"
              name="name"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.name}
            />
            {formik.touched.name && formik.errors.name ? (
              <div className="error">{formik.errors.name as string}</div>
            ) : null}
          </label>
          
          <label>
            Email
            <input
              type="email"
              name="email"
              onBlur={formik.handleBlur}
              value={formik.values.email}
              disabled={true}
            />
            {formik.touched.email && formik.errors.email ? (
              <div className="error">{formik.errors.email as string}</div>
            ) : null}
          </label>
          
          <label>
            Phone Number
            <div className="phone-input-container">
              <PhoneInput
                international
                countryCallingCodeEditable={true}
                defaultCountry="IN"
                value={phoneValue}
                onChange={(value) => {
                  setPhoneValue(value || '');
                }}
                className="phone-input"
              />
            </div>
            {formik.touched.number && formik.errors.number ? (
              <div className="error">{formik.errors.number as string}</div>
            ) : null}
          </label>
          
          <label>
            Nationality
            <div className="country-selector" ref={dropdownRef}>
              <div 
                className="country-input-container" 
                onClick={handleInputClick}
              >
                {selectedCountry ? (
                  <div className="selected-country">
                    <span className="country-flag">
                      {getCountryFlagEmoji(selectedCountry.isoCode)}
                    </span>
                    <span className="country-name">{selectedCountry.name}</span>
                  </div>
                ) : (
                  <div className="country-placeholder">Select a country</div>
                )}
              </div>
              
              {showDropdown && (
                <div className="country-dropdown">
                  <div className="search-container">
                    <input
                      type="text"
                      ref={searchInputRef}
                      className="country-search"
                      placeholder="Search countries..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                  </div>
                  <div className="country-list">
                    {filteredCountries.length > 0 ? (
                      filteredCountries.map(country => (
                        <div
                          key={country.isoCode}
                          className={`country-item ${selectedCountry?.isoCode === country.isoCode ? 'selected' : ''}`}
                          onClick={() => handleCountryClick(country)}
                        >
                          <span className="country-flag">
                            {getCountryFlagEmoji(country.isoCode)}
                          </span>
                          <span className="country-name">{country.name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="no-results">No countries found</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Hidden input to store the country name for form submission */}
              <input
                type="hidden"
                name="nationality"
                value={formik.values.nationality}
              />
            </div>
            {formik.touched.nationality && formik.errors.nationality ? (
              <div className="error">{formik.errors.nationality as string}</div>
            ) : null}
          </label>
          
          <label>
            Address
            <input
              type="text"
              name="address"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.address}
            />
            {formik.touched.address && formik.errors.address ? (
              <div className="error">{formik.errors.address as string}</div>
            ) : null}
          </label>
          
          <label>
            Gender
            <select
              name="gender"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.gender}
              className="gender-select"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
            {formik.touched.gender && formik.errors.gender ? (
              <div className="error">{formik.errors.gender as string}</div>
            ) : null}
          </label>
        </div>
        
        <button 
          type="submit" 
          disabled={updateProfileMutation.isPending}
        >
          {updateProfileMutation.isPending ? 'Updating...' : 'Update Profile'}
        </button>
      </form>
    </div>
  );
};

export default UpdateProfile;