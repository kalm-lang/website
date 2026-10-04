import './components/theme-toggle';
import './components/site-nav';
import './components/code-block';
import './components/code-tabs';
import { enhanceDisclosures } from './components/disclosures';
import { enhanceFeatureDialogs } from './components/feature-dialogs';
import { enhanceSectionNavigation } from './components/section-nav';

enhanceDisclosures();
enhanceFeatureDialogs();
enhanceSectionNavigation();

// Content remains ordinary HTML; Lit adds focused, reusable interactions.
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    entry.target.classList.add('visible');
    observer.unobserve(entry.target);
  }
}, { threshold: 0.08 });
document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
