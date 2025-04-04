import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Forum.scss';

const Forum = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [comments, setComments] = useState<Array<{id: number, email: string, text: string, date: string}>>([]);
  const [newComment, setNewComment] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  // Sample comments (in a real app, these would come from an API)
  const sampleComments = [
    { id: 1, email: 'user1@example.com', text: 'The patent search functionality is amazing!', date: '2023-04-10' },
    { id: 2, email: 'user2@example.com', text: 'How do I save more than 10 patents in the trial version?', date: '2023-04-11' },
    { id: 3, email: 'admin@allinonesearch.com', text: 'You need to upgrade to at least the Monthly plan to save more patents.', date: '2023-04-11' }
  ];

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
    setComments(sampleComments);
  }, []);

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);
  };

  const handleSubmitComment = () => {
    if (!isLoggedIn) {
      setErrorMessage('Please sign in to post comments.');
      return;
    }

    if (!newComment.trim()) {
      setErrorMessage('Please enter a comment.');
      return;
    }

    const newCommentObj = {
      id: comments.length + 1,
      email: email,
      text: newComment.trim(),
      date: new Date().toISOString().split('T')[0]
    };

    setComments([...comments, newCommentObj]);
    setNewComment('');
    setErrorMessage('');
  };

  const handleSignIn = () => {
    navigate('/auth/login');
  };

  return (
    <div className="forum-container">
      <div className="forum-header">
        <h1>AllinoneSearch Forum</h1>
        <p>Join the discussion about patent search and our services</p>
      </div>

      <div className="forum-content">
        <div className="comments-section">
          <h2>Recent Discussions</h2>
          
          {comments.length > 0 ? (
            <div className="comments-list">
              {comments.map(comment => (
                <div key={comment.id} className="comment-card">
                  <div className="comment-header">
                    <span className="comment-author">{comment.email}</span>
                    <span className="comment-date">{comment.date}</span>
                  </div>
                  <div className="comment-body">
                    <p>{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-comments">No comments yet. Be the first to start a discussion!</p>
          )}
        </div>

        <div className="comment-form">
          <h3>Add Your Comment</h3>
          
          {isLoggedIn ? (
            <>
              <div className="user-info">
                <p>Posting as: <span className="user-email">{email}</span></p>
              </div>
              <textarea 
                value={newComment}
                onChange={handleCommentChange}
                placeholder="Write your comment here..."
                rows={4}
              />
              {errorMessage && <p className="error-message">{errorMessage}</p>}
              <button 
                className="btn-submit-comment"
                onClick={handleSubmitComment}
              >
                Submit Comment
              </button>
            </>
          ) : (
            <div className="login-prompt">
              <p>Please sign in to post comments on the forum.</p>
              <button 
                className="btn-sign-in"
                onClick={handleSignIn}
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Forum; 