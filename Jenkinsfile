/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
library(
    identifier: 'jenkins-lib-common@v4.11.0',
    retriever: modernSCM([
        $class: 'GitSCMSource',
        remote: 'git@github.com:zextras/jenkins-lib-common.git',
        credentialsId: 'jenkins-integration-with-github-account'
    ])
)

// npm-only library: no dist/yap.json, no deb/rpm, so the Package stage is skipped.
// On PRs `pnpm run build` is exercised through `type-check:ci` (see package.json).
uiPipeline(hasPackage: false)
