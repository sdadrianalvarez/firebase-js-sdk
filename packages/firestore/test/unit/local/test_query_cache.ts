/**
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Query } from '../../../src/core/query';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { TargetId } from '../../../src/core/types';
import { Persistence } from '../../../src/local/persistence';
import { QueryCache } from '../../../src/local/query_cache';
import { QueryData } from '../../../src/local/query_data';
import { documentKeySet } from '../../../src/model/collections';
import { DocumentKey } from '../../../src/model/document_key';

/**
 * A wrapper around a QueryCache that automatically creates a
 * transaction around every operation to reduce test boilerplate.
 */
export class TestQueryCache {
  constructor(public persistence: Persistence, public cache: QueryCache) {}

  addQueryData(queryData: QueryData): Promise<void> {
    return this.persistence.runTransaction('addQueryData', false, txn => {
      return this.cache.addQueryData(txn, queryData);
    });
  }

  updateQueryData(queryData: QueryData): Promise<void> {
    return this.persistence.runTransaction('updateQueryData', true, txn => {
      return this.cache.updateQueryData(txn, queryData);
    });
  }

  getQueryCount(): Promise<number> {
    return this.persistence.runTransaction('getQueryCount', false, txn => {
      return this.cache.getQueryCount(txn);
    });
  }

  removeQueryData(queryData: QueryData): Promise<void> {
    return this.persistence.runTransaction('addQueryData', true, txn => {
      return this.cache.removeQueryData(txn, queryData);
    });
  }

  getQueryData(query: Query): Promise<QueryData | null> {
    return this.persistence.runTransaction('getQueryData', false, txn => {
      return this.cache.getQueryData(txn, query);
    });
  }

  getLastRemoteSnapshotVersion(): Promise<SnapshotVersion> {
    return this.persistence.runTransaction(
      'getLastRemoteSnapshotVersion',
      false,
      txn => {
        return this.cache.getLastRemoteSnapshotVersion(txn);
      }
    );
  }

  allocateTargetId(): Promise<TargetId> {
    return this.persistence.runTransaction('allocateTargetId', false, txn => {
      return this.cache.allocateTargetId(txn);
    });
  }

  addMatchingKeys(keys: DocumentKey[], targetId: TargetId): Promise<void> {
    return this.persistence.runTransaction('addMatchingKeys', true, txn => {
      let set = documentKeySet();
      for (const key of keys) {
        set = set.add(key);
      }
      return this.cache.addMatchingKeys(txn, set, targetId);
    });
  }

  removeMatchingKeys(keys: DocumentKey[], targetId: TargetId): Promise<void> {
    return this.persistence.runTransaction('removeMatchingKeys', true, txn => {
      let set = documentKeySet();
      for (const key of keys) {
        set = set.add(key);
      }
      return this.cache.removeMatchingKeys(txn, set, targetId);
    });
  }

  getMatchingKeysForTargetId(targetId: TargetId): Promise<DocumentKey[]> {
    return this.persistence
      .runTransaction('getMatchingKeysForTargetId', false, txn => {
        return this.cache.getMatchingKeysForTargetId(txn, targetId);
      })
      .then(keySet => {
        const result: DocumentKey[] = [];
        keySet.forEach(key => result.push(key));
        return result;
      });
  }

  removeMatchingKeysForTargetId(targetId: TargetId): Promise<void> {
    return this.persistence.runTransaction(
      'removeMatchingKeysForTargetId',
      true,
      txn => {
        return this.cache.removeMatchingKeysForTargetId(txn, targetId);
      }
    );
  }

  containsKey(key: DocumentKey): Promise<boolean> {
    return this.persistence.runTransaction('containsKey', false, txn => {
      return this.cache.containsKey(txn, key);
    });
  }

  setTargetsMetadata(
    highestListenSequenceNumber: number,
    lastRemoteSnapshotVersion?: SnapshotVersion
  ): Promise<void> {
    return this.persistence.runTransaction('setTargetsMetadata', true, txn =>
      this.cache.setTargetsMetadata(
        txn,
        highestListenSequenceNumber,
        lastRemoteSnapshotVersion
      )
    );
  }
}
