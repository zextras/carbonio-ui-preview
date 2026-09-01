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
					// enable release also for refactor and build commits
					{ type: 'refactor', release: 'patch' },
					{ type: 'build', release: 'patch' }
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
