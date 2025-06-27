export const dynamic = "force-dynamic";
import './globals.css';
import Header from './components/ClientComponents/Header/Header';
import MoreDetails from './components/ServerComponents/MoreDetails/MoreDetails';
import ScrollAnimations from './components/ClientComponents/ScrollAnimations/ScrollAnimations';
import ProblemSection from './components/ServerComponents/ProblemSection/ProblemSection';
import Introduction from './components/ServerComponents/Introduction/Introduction';
import HowItWorksSection from './components/ServerComponents/HowItWorksSection/HowItWorksSection';
import FlowersRenderer from './components/ClientComponents/FlowersRenderer/FlowersRenderer';
import SwipeUpButton from './components/ClientComponents/SwipeUpButton/SwipeUpButton';
import ScrollHandler from './components/ClientComponents/ScrollHandler/ScrollHandler';


export default function Home() {
  return (
    <div className="App">
      <ScrollHandler />
      <Header isLoggedIn={false} hiveDetails={false}/>
      <ScrollAnimations />
      <FlowersRenderer /> {/* only for screens above 1560px */}

      <main className="main-content">
        <Introduction />
        <ProblemSection />
        <HowItWorksSection />
        <MoreDetails />
      </main>
      <SwipeUpButton />
    </div>
  );
}