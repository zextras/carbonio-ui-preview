/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
	branches: [
		'main',
		{
			name: 'beta',
			prerelease: true
		}
	],
	plugins: [
		[
			'@semantic-release/commit-analyzer',
			{
				preset: 'conventionalcommits',
				releaseRules: [
					// the breaking rule is required: as soon as a custom rule matches (e.g. refactor→patch) the default
					// rules are no longer evaluated, so without it a breaking refactor would only get a patch
					{ breaking: true, release: 'major' },
					// enable release also for refactor and build commits
					{ type: 'refactor', release: 'patch' },
					{ type: 'build', release: 'patch' },
					{ type: 'ci', release: 'patch' },
					{ type: 'perf', release: 'patch' }
				]
			}
		],
		[
			'@semantic-release/release-notes-generator',
			{
				preset: 'conventionalcommits'
			}
		],
		'@semantic-release/npm',
		'@semantic-release/github'
	]
};
