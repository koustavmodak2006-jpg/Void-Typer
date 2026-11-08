import { createRoot } from 'react-dom/client';
import './styles/global.css';
import './styles/landing.css';
import './styles/game.css';
import './styles/results.css';
import './styles/responsive.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);
