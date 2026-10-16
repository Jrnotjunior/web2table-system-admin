import { useCallback } from 'react';
import {
  buildNavigationSearch,
  getNavigationFromSearch,
  type NavigationPage,
} from './navigation';

type NavigationOptions = {
  restaurantId?: string;
  auditId?: string;
};

/** Keep URL parsing and history updates in one place for the admin app. */
export default function useAppNavigation() {
  const getNavigationFromUrl = useCallback(
    () => getNavigationFromSearch(window.location.search),
    [],
  );

  const pushNavigation = useCallback(
    (page: NavigationPage, options: NavigationOptions = {}) => {
      window.history.pushState({}, '', buildNavigationSearch(page, options));
    },
    [],
  );

  return { getNavigationFromUrl, pushNavigation };
}
