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

import { SnapshotVersion } from '../core/snapshot_version';
import { fail } from '../util/assert';
import { AnyJs } from '../util/misc';

import { DocumentKey } from './document_key';
import { FieldValue, JsonObject, ObjectValue } from './field_value';
import { FieldPath } from './path';

export interface DocumentOptions {
  hasLocalMutations: boolean;
}

/**
 * The result of a lookup for a given path may be an existing document or a
 * marker that this document does not exist at a given version.
 */
export abstract class MaybeDocument {
  constructor(
    readonly key: DocumentKey,
    readonly remoteVersion: SnapshotVersion,
    readonly commitVersion: SnapshotVersion
  ) {}

  static compareByKey(d1: MaybeDocument, d2: MaybeDocument): number {
    return DocumentKey.comparator(d1.key, d2.key);
  }
}

/**
 * Represents a document in Firestore with a key, version, data and whether the
 * data has local mutations applied to it.
 */
export class Document extends MaybeDocument {
  readonly hasLocalMutations: boolean;

  constructor(
    key: DocumentKey,
    remoteVersion: SnapshotVersion,
    commitVersion: SnapshotVersion,
    readonly data: ObjectValue,
    options: DocumentOptions
  ) {
    super(key, remoteVersion, commitVersion);
    this.hasLocalMutations = options.hasLocalMutations;
  }

  field(path: FieldPath): FieldValue | undefined {
    return this.data.field(path);
  }

  fieldValue(path: FieldPath): AnyJs {
    const field = this.field(path);
    return field ? field.value() : undefined;
  }

  value(): JsonObject<AnyJs> {
    return this.data.value();
  }

  hasPendingWrites(baseSnapshotVersion: SnapshotVersion): boolean {
    if (this.hasLocalMutations) {
      return true;
    }

    // If the document was committed after Watch has delivered the base
    // snapshot, we raise `hasPendingWrites` as long as the local commit version
    // remains higher than the version sent to us by Watch.
    if (
      !baseSnapshotVersion.isEqual(SnapshotVersion.MIN) &&
      this.commitVersion.compareTo(baseSnapshotVersion) >= 0
    ) {
      return this.commitVersion.compareTo(this.remoteVersion) > 0;
    }

    return false;
  }

  isEqual(other: Document | null | undefined): boolean {
    return (
      other instanceof Document &&
      this.key.isEqual(other.key) &&
      this.remoteVersion.isEqual(other.remoteVersion) &&
      this.commitVersion.isEqual(other.commitVersion) &&
      this.data.isEqual(other.data) &&
      this.hasLocalMutations === other.hasLocalMutations
    );
  }

  toString(): string {
    return (
      `Document(${this.key}, ${this.remoteVersion}, ${this.data.toString()}, ` +
      `{hasLocalMutations: ${this.hasLocalMutations}})`
    );
  }

  static compareByField(field: FieldPath, d1: Document, d2: Document): number {
    const v1 = d1.field(field);
    const v2 = d2.field(field);
    if (v1 !== undefined && v2 !== undefined) {
      return v1.compareTo(v2);
    } else {
      return fail("Trying to compare documents on fields that don't exist");
    }
  }
}

/**
 * A class representing a deleted document.
 * Version is set to 0 if we don't point to any specific time, otherwise it
 * denotes time we know it didn't exist at.
 */
export class NoDocument extends MaybeDocument {
  constructor(
    key: DocumentKey,
    remoteVersion: SnapshotVersion,
    commitVersion: SnapshotVersion
  ) {
    super(key, remoteVersion, commitVersion);
  }

  toString(): string {
    return `NoDocument(${this.key}, ${this.remoteVersion})`;
  }

  isEqual(other: NoDocument): boolean {
    return (
      other &&
      other.remoteVersion.isEqual(this.remoteVersion) &&
      other.commitVersion.isEqual(this.commitVersion) &&
      other.key.isEqual(this.key)
    );
  }
}
