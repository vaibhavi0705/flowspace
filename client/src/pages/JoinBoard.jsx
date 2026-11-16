import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import Loader from '../components/Loader';

// Opened from an invite link. Adds the visitor to the board, then sends them there.
export default function JoinBoard() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .post('/boards/join', { code })
      .then((res) => navigate(`/board/${res.data.boardId}`, { replace: true }))
      .catch((err) => setError(errMsg(err)));
  }, [code, navigate]);

  if (!error) return <Loader full label="Joining board" />;
  return (
    <div className="center-screen">
      <div className="empty">
        <h2>We couldn’t open that invite</h2>
        <p>{error}</p>
        <Link className="btn btn-primary" to="/dashboard">Go to my boards</Link>
      </div>
    </div>
  );
}
