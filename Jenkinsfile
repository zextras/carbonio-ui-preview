/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Package utils
String getPackageName() {
    return sh(
        script: """
            cat package.json \
            | jq --raw-output '.name'
            """,
        returnStdout: true
    ).trim()
}

def getNodeVersion() {
	return sh(
		script: 'sed "s/^[vV]//" .nvmrc | cut -d. -f1',
		returnStdout: true
	).trim()
}

void npmLogin(String npmAuthToken) {
	if (!fileExists(file: '.npmrc')) {
		sh(
			script: """
                echo "//registry.npmjs.org/:_authToken=${npmAuthToken}" >> .npmrc
            """,
			returnStdout: false
		)
	}
}


// FLAGS
Boolean isReleaseBranch
Boolean isDevelBranch
Boolean isPullRequest
String nodeVersion
// PROJECT DETAILS
String pkgName

pipeline {
	agent {
		node {
			label 'nodejs-v1'
		}
	}
	parameters {
        booleanParam defaultValue: false, description: 'Run with test', name: 'TEST'
        booleanParam defaultValue: true, description: 'Enable SonarQube Stage', name: 'RUN_SONARQUBE'
    }
	options {
		timeout(time: 20, unit: 'MINUTES')
		buildDiscarder(logRotator(numToKeepStr: '50'))
	}
	post {
        always {
            script {
                container('base') {
                    def commitEmail = sh(
                        script: "git --no-pager show -s --format='%ae'",
                        returnStdout: true
                    ).trim()
                    emailext(
                        attachLog: true,
                        body: "\$DEFAULT_CONTENT",
                        recipientProviders: [requestor()],
                        subject: "\$DEFAULT_SUBJECT",
                        to: "${commitEmail}"
                    )
                }
            }
        }
    }
	stages {
		stage('Read settings') {
			steps {
				container('base') {
					script {
						isReleaseBranch = "${BRANCH_NAME}" ==~ /(release|master)/
                        echo "isReleaseBranch: ${isReleaseBranch}"
                        isDevelBranch = "${BRANCH_NAME}" ==~ /devel/
                        echo "isDevelBranch: ${isDevelBranch}"
                        isPullRequest = "${BRANCH_NAME}" ==~ /PR-\d+/
                        echo "isPullRequest: ${isPullRequest}"
                        pkgName = getPackageName()
                        echo "pkgName: ${pkgName}"
                        nodeVersion = getNodeVersion()
                        echo "NodeJS Major Version: $nodeVersion"
                        isSonarQubeEnabled = params.RUN_SONARQUBE == true && (isPullRequest || isDevelBranch || isReleaseBranch)
                        echo "isSonarQubeEnabled: ${isSonarQubeEnabled}"
					}
				}
				container('pnpm') {
					script {
						sh 'corepack enable'
					}
				}
				withCredentials([
					usernamePassword(
						credentialsId: 'npm-zextras-bot-auth-token',
						usernameVariable: 'NPM_USERNAME',
						passwordVariable: 'NPM_PASSWORD'
					)
				]) {
					script {
						npmLogin(NPM_PASSWORD)
					}
				}
			}
		}
		stage('Install dependencies') {
			steps {
				container('pnpm') {
					script {
						sh 'pnpm install --frozen-lockfile'
					}
				}
			}
		}
		stage('Tests') {
			 when {
                anyOf {
                    expression { isSonarQubeEnabled == true }
                    expression { isPullRequest == true }
                    expression { isDevelBranch == true }
                    expression { params.TEST == true }
                }
            }
			parallel {
				stage('Lint') {
					steps {
						container('pnpm') {
							catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
								sh 'pnpm run lint'
							}
						}
					}
				}
				stage('TypeCheck') {
					steps {
						container('pnpm') {
							catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
								sh 'pnpm run type-check'
							}
						}
					}
				}
				stage('Unit Tests') {
					steps {
						container('pnpm') {
							catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
								sh 'pnpm run test'
							}
						}
					}
					post {
						success {
							container('pnpm') {
								script {
                                    if (fileExists('junit.xml')) {
                                        junit(
                                            allowEmptyResults: true,
                                            testResults: 'junit.xml'
                                        )
                                        recordCoverage(tools: [[parser: 'COBERTURA', pattern: 'coverage/cobertura-coverage.xml']])
                                    }
                                }
							}
						}
					}
				}
			}
		}
		stage('SonarQube Check') {
			when {
				allOf {
                    expression { isSonarQubeEnabled == true }
                }
			}
			steps {
				container('pnpm') {
					script {
                        // remove @zextras/ prefix to make pkgName a valid sonarqube project key
                        def sonarQubeProjectKey = pkgName.replaceAll("@zextras/", "")
						withSonarQubeEnv(credentialsId: 'sonarqube-user-token', installationName: 'SonarQube instance') {
							sh "pnpm exec sonar-scanner -Dsonar.projectKey=${sonarQubeProjectKey} -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info"
						}
					}
				}
			}
		}
		stage('Build') {
			steps {
				container('pnpm') {
					script {
						sh 'pnpm run build'
					}
				}
			}
		}
		stage('Release to NPM') {
			when {
				allOf {
                    expression { isPullRequest == false }
                }
			}
			steps {
				container('pnpm') {
					script {
						withCredentials([usernamePassword(credentialsId: 'npm-zextras-bot-auth-token', usernameVariable: 'AUTH_USERNAME', passwordVariable: 'NPM_TOKEN')]) {
							withCredentials([usernamePassword(credentialsId: 'jenkins-integration-with-github-account', usernameVariable: 'GH_USERNAME', passwordVariable: 'GH_TOKEN')]) {
								sh 'pnpm exec semantic-release'
							}
						}
					}
				}
			}
		}
	}
}

