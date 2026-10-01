import { createContext, useContext } from 'react';
import { db, type PersonalDB } from './db';

export interface DatabaseScope {
  db: PersonalDB;
  /** The landing-page playground: a throwaway database, no dialogs, no 1:1s. */
  demo: boolean;
}

const DatabaseContext = createContext<DatabaseScope>({ db, demo: false });

/** Lets a subtree (the landing-page demo) work against another database than the app's. */
export const DatabaseProvider = DatabaseContext.Provider;

export function useDatabase(): PersonalDB {
  return useContext(DatabaseContext).db;
}

export function useIsDemo(): boolean {
  return useContext(DatabaseContext).demo;
}
