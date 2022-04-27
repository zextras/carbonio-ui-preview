/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
module.exports = {
	extends: ['./node_modules/@zextras/carbonio-ui-configs/rules/eslint.js'],
	plugins: ['notice'],
	rules: {
		'notice/notice': [
			'error',
			{
				templateFile: './notice.template.js'
			}
		]
	},
	ignorePatterns: ['notice.template.js']
};
