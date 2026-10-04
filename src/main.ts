import './components/theme-toggle';
import './components/site-nav';
import './components/code-block';
import './components/code-tabs';
import { enhanceFeatureDialogs } from './components/feature-dialogs';
import { enhanceSectionNavigation } from './components/section-nav';
import { enhanceDocumentScrollbar } from './components/document-scrollbar';
import { enhanceMainFocus } from './components/main-focus';

enhanceFeatureDialogs();
enhanceSectionNavigation();
enhanceDocumentScrollbar();
enhanceMainFocus();

// Content remains ordinary HTML; browser code only adds focused interactions.
