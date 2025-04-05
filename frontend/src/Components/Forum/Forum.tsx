import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackApi, FeedbackSubmission } from '../../api/feedback';
import toast from 'react-hot-toast';
import './Forum.scss';

interface Comment {
  id: string;
  email: string;
  comment: string;
  text?: string;
  date: string;
}

const Forum = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestComment, setGuestComment] = useState('');
  const [guestErrorMessage, setGuestErrorMessage] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch comments using React Query
  const { data: commentData, isLoading: commentsLoading } = useQuery({
    queryKey: ['feedbackComments'],
    queryFn: async () => {
      const response = await feedbackApi.getFeedbackComments();
      return response;
    }
  });

  // Process the comment data when it changes
  useEffect(() => {
    if (commentData?.statusCode === 200) {
      setComments(commentData.data.map((comment: any) => ({
        id: comment._id,
        email: comment.email,
        text: comment.comment,
        comment: comment.comment,
        date: new Date(comment.date).toISOString().split('T')[0]
      })));
    }
  }, [commentData]);

  // Mutation for submitting feedback
  const submitFeedbackMutation = useMutation({
    mutationFn: (feedback: FeedbackSubmission) => feedbackApi.submitFeedback(feedback),
    onSuccess: (data) => {
      if (data.statusCode === 200) {
        toast.success('Feedback submitted successfully!');
        
        // Reset form
        setGuestEmail('');
        setGuestComment('');
        setGuestErrorMessage('');
        
        // Refresh comments
        queryClient.invalidateQueries({ queryKey: ['feedbackComments'] });
      } else {
        toast.error(data.message || 'Failed to submit feedback');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit feedback');
    }
  });

  useEffect(() => {
    // In a real app, you would check if the user is logged in from your auth context/service
    // For now, we'll just simulate a check
    const checkAuth = async () => {
      try {
        // This would be an API call to check if the user is logged in
        // For now, we'll just set a fake email to simulate a logged-in user
        const fakeCheckAuth = Math.random() > 0.5; // randomly simulate logged in or not
        if (fakeCheckAuth) {
          setIsLoggedIn(true);
          setEmail('user@example.com');
        } else {
          setIsLoggedIn(false);
          setEmail('');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      }
    };

    checkAuth();
  }, []);

  const handleGuestEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGuestEmail(e.target.value);
  };

  const handleGuestCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGuestComment(e.target.value);
  };

  const handleGuestSubmitComment = () => {
    // Validate inputs
    if (!guestEmail.trim()) {
      setGuestErrorMessage('Please enter your email address.');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail)) {
      setGuestErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!guestComment.trim()) {
      setGuestErrorMessage('Please enter a comment.');
      return;
    }

    // Submit guest feedback
    submitFeedbackMutation.mutate({
      email: guestEmail.trim(),
      comment: guestComment.trim()
    });
  };

  const handleSignIn = () => {
    navigate('/auth/login');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  // Add a function to truncate email addresses
  const truncateEmail = (email: string) => {
    if (!email) return '';
    const atIndex = email.indexOf('@');
    if (atIndex > 0) {
      return email.substring(0, atIndex);
    }
    return email;
  };

  return (
    <div className="forum-container">
      <div className="forum-nav">
        <div className="logo" onClick={() => handleNavigation('/')}>PatentsBrowser</div>
        <div className="nav-buttons">
          <button 
            className="btn btn-home"
            onClick={() => handleNavigation('/')}
          >
            Home
          </button>
          {!isLoggedIn && (
            <>
              <button 
                className="btn btn-outline"
                onClick={() => handleNavigation('/auth/login')}
              >
                Sign In
              </button>
              <button 
                className="btn btn-signup"
                onClick={() => handleNavigation('/auth/signup')}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>

      <div className="forum-header">
        <h1>PatentsBrowser Forum</h1>
        <p>Join the discussion about patent search and our services</p>
      </div>

      <div className="forum-content">
        <div className="forum-layout">
          {/* Left side - Comments section */}
          <div className="comments-section">
            <h2> Feedback</h2>
            
            {commentsLoading ? (
              <div className="loading-comments">Loading comments...</div>
            ) : comments.length > 0 ? (
              <div className="comments-list">
                {comments.map(comment => (
                  <div key={comment.id} className="comment-card">
                    <div className="comment-header">
                      <span className="comment-author">{truncateEmail(comment.email)}</span>
                      <span className="comment-date">{comment.date}</span>
                    </div>
                    <div className="comment-body">
                      <p>{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-comments">No feedback yet. Be the first to share your thoughts!</p>
            )}
          </div>

          {/* Right side - Comment form */}
          <div className="forum-forms">
            {/* Feedback form for guests (no sign-in required) */}
            <div className="guest-feedback-form">
              <h3>Leave Your Feedback</h3>
              <p className="form-description">
                Share your thoughts about our services without signing in.
              </p>
              
              <div className="form-field">
                <label htmlFor="guestEmail">Email</label>
                <input
                  type="email"
                  id="guestEmail"
                  value={guestEmail}
                  onChange={handleGuestEmailChange}
                  placeholder="your@email.com"
                />
              </div>
              
              <div className="form-field">
                <label htmlFor="guestComment">Comment</label>
                <textarea
                  id="guestComment"
                  value={guestComment}
                  onChange={handleGuestCommentChange}
                  placeholder="Share your feedback or ask a question..."
                  rows={4}
                />
              </div>
              
              {guestErrorMessage && <p className="error-message">{guestErrorMessage}</p>}
              
              <button
                className="btn btn-primary"
                onClick={handleGuestSubmitComment}
                disabled={submitFeedbackMutation.isPending}
              >
                {submitFeedbackMutation.isPending ? 'Submitting...' : 'Submit'}
              </button>
            </div>
            
            {/* Navigation options */}
            {!isLoggedIn && (
              <div className="navigation-options">
                <h3>Account Options</h3>
                <p className="nav-description">
                  Create an account or sign in to save your search history and preferences.
                </p>
                <div className="nav-buttons-container">
                  <button 
                    className="btn btn-home"
                    onClick={() => handleNavigation('/')}
                  >
                    Home
                  </button>
                  <button 
                    className="btn btn-home"
                    onClick={() => handleNavigation('/auth/login')}
                  >
                    Sign In
                  </button>
                  <button 
                    className="btn btn-home"
                    onClick={() => handleNavigation('/auth/signup')}
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forum; 