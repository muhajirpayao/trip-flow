import { TripProvider } from './context/TripContext';
import AppRouter from './routes/AppRouter';

export default function App() {
  return (
    <TripProvider>
      <AppRouter />
    </TripProvider>
  );
}
//deployed actively 