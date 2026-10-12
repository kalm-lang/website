import { enhanceHomeNavigation } from './components/home-navigation';
import './components/theme-toggle';
import './components/site-nav';
import './components/code-block';
import './components/greeting-demo';
import './components/code-tabs';
import './components/code-compare';
import './components/dialect-toggle';
import { enhanceFeatureDialogs } from './components/feature-dialogs';
import { enhanceSectionNavigation } from './components/section-nav';
import { enhanceDocumentScrollbar } from './components/document-scrollbar';
import { enhanceMainFocus } from './components/main-focus';

enhanceFeatureDialogs();
enhanceSectionNavigation();
enhanceDocumentScrollbar();
enhanceMainFocus();
enhanceHomeNavigation();

// Content remains ordinary HTML; browser code only adds focused interactions.
