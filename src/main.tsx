import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {verifyFirestoreConnection} from './lib/firebase/client';

void verifyFirestoreConnection();

createRoot(document.getElementById('root')!).render(<App />);
