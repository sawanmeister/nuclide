/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 */

import {
  activateAllPackages,
  jasmineIntegrationTestSetup,
  deactivateAllPackages,
} from './utils/integration-test-helpers';
import {setLocalProject} from '../pkg/commons-atom/testHelpers';
import fs from 'fs';
import invariant from 'assert';
import uiTreePath from '../pkg/commons-atom/ui-tree-path';
import nuclideUri from '../pkg/commons-node/nuclideUri';
import {generateHgRepo2Fixture} from '../pkg/nuclide-test-helpers';

// TODO(t13905062) Update Diff View integration tests.
// eslint-disable-next-line jasmine/no-disabled-tests
xdescribe('Diff View Browse Mode Integration Test', () => {
  let localRepoPath: string = (null: any);

  beforeEach(() => {
    waitsForPromise({timeout: 200000}, async () => {
      jasmineIntegrationTestSetup();
      // Activate atom packages.
      await activateAllPackages();
      // Copy local mercurial project to temporary directory.
      localRepoPath = await generateHgRepo2Fixture();
      fs.writeFileSync(nuclideUri.join(localRepoPath, 'test.txt'), 'dirty changes', 'utf8');
      fs.writeFileSync(nuclideUri.join(localRepoPath, 'untracked.txt'), 'untracked', 'utf8');
      // Add those two local directories as a new project in atom.
      setLocalProject([localRepoPath]);
      // Open the test.txt file in the repo.
      await atom.workspace.open(nuclideUri.join(localRepoPath, 'test.txt'));
    });
  });

  afterEach(() => {
    deactivateAllPackages();
  });

  it('tests opening the diff view in browse mode', () => {
    // Open diff view with the `test.txt` file.
    const textEditor = atom.workspace.getActiveTextEditor();
    invariant(textEditor, 'no active text editor!');
    atom.commands.dispatch(atom.views.getView(textEditor), 'nuclide-diff-view:open');

    let diffViewElement: ?HTMLElement = (null: any);
    waitsFor('diff view to load', 10000, () => {
      diffViewElement = atom.workspace.getActivePaneItem();
      return diffViewElement != null && diffViewElement.tagName === 'NUCLIDE-DIFF-VIEW';
    });

    let revisionsTimelineElement: ?HTMLElement = (null: any);
    let treeElement: ?HTMLElement = (null: any);

    runs(() => {
      invariant(diffViewElement);
      const textEditorElements = diffViewElement.querySelectorAll('atom-text-editor');
      expect(textEditorElements.length).toBe(2);
      treeElement = diffViewElement.querySelector('.nuclide-diff-view-tree');
      expect(treeElement).not.toBeNull();
      revisionsTimelineElement = diffViewElement.querySelector('.nuclide-diff-timeline');
      expect(revisionsTimelineElement).not.toBeNull();
    });

    let revisionLabels = [];

    waitsFor('revisions to load', () => {
      invariant(revisionsTimelineElement != null);
      revisionLabels = revisionsTimelineElement.querySelectorAll('.revision-label');
      return revisionLabels.length > 0;
    });

    runs(() => {
      // Should be the number of revisions and account for the permanent "Uncommitted" node.
      expect(revisionLabels.length).toBe(3);
      // Click on the commit below head to include the HEAD commit changes.
      revisionLabels[1].click();
    });

    let diffFiles = [];
    waitsFor('file changes to load', () => {
      invariant(treeElement != null);
      diffFiles = treeElement.querySelectorAll('.nuclide-file-changes-file-entry');
      return diffFiles.length > 2;
    });

    runs(() => {
      expect(diffFiles.length).toBe(3);
      expect(uiTreePath(({currentTarget: diffFiles[0]}: any))).toBe(
        nuclideUri.join(localRepoPath, '.arcconfig'),
      );
      expect(uiTreePath(({currentTarget: diffFiles[1]}: any))).toBe(
        nuclideUri.join(localRepoPath, 'test.txt'),
      );
      expect(uiTreePath(({currentTarget: diffFiles[2]}: any))).toBe(
        nuclideUri.join(localRepoPath, 'untracked.txt'),
      );
      invariant(treeElement != null);
      const treeRoots = treeElement.querySelectorAll('.nuclide-file-changes-root-entry');
      expect(treeRoots.length).toBe(0);
    });
  });
});
