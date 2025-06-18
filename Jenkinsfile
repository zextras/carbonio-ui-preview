/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// git utils
String getRepositoryName() {
    return sh(script: '''
        git remote -v | head -n1 | cut -d$'\t' -f2 | cut -d' ' -f1 | sed -e 's!https://github.com/!!g' -e 's!git@github.com:!!g' -e 's!.git!!g'
    ''', returnStdout: true).trim()
}

String getLastTag() {
    return sh(script: '''
        git describe --tags --abbrev=0
    ''', returnStdout: true).trim()
}

Boolean tagExistsAtHead() {
    try {
        sh(script: '''
            git describe --tags --exact-match
        ''', returnStdout: true)
        return true
    } catch (err) {
        return false
    }
}

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

// node utils
void nodeCmd(Map args = [:]) {
    final boolean install = (args.install != null) ? args.install : false
    def varEnv = []
    ((args.varEnv != null) ? args.varEnv : []).each { k, v -> varEnv.push("$k=$v") }
    String version
    if (fileExists('.nvmrc')) {
        version = ''
    } else {
        version = (args.version != null) ? "${args.version} " : '20'
    }
    sh(
        script: """
            ${varEnv.join(' ')}
            ${args.script != null ? "${args.script} " : ''} \
        """
    )
}

void npxCmd(Map args = [:]) {
    nodeCmd(
        version: args.nodeVersion,
        install: args.install,
        script: """
            npx ${args.script}
            """,
        varEnv: args.varEnv
    )
}

void npmLogin(String npmAuthToken) {
    sh(
        script: """
            echo "//registry.npmjs.org/:_authToken=${npmAuthToken}" >> .npmrc
        """,
        returnStdout: false
    )
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
            label "nodejs-v1"
        }
    }
    parameters {
        booleanParam defaultValue: false, description: 'Run with test', name: 'TEST'
        booleanParam defaultValue: true, description: 'Enable SonarQube Stage', name: 'RUN_SONARQUBE'
    }
    options {
        timeout(time: 20, unit: "MINUTES")
        buildDiscarder(logRotator(numToKeepStr: "50"))
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
        stage("Read settings") {
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
                    withCredentials([
                        usernamePassword(
                            credentialsId: "npm-zextras-bot-auth-token",
                            usernameVariable: "NPM_USERNAME",
                            passwordVariable: "NPM_PASSWORD"
                        )
                    ]) {
                        script {
                            npmLogin(NPM_PASSWORD)
                        }
                    }
                }
            }
        }
        stage('Install dependencies') {
            steps {
                container('nodejs-' + nodeVersion) {
                    script {
                        sh 'npm ci'
                    }
                }
            }
        }        
        stage("Tests") {
            when {
                anyOf {
                    expression { isSonarQubeEnabled == true }
                    expression { isPullRequest == true }
                    expression { isDevelBranch == true }
                    expression { params.TEST == true }
                }
            }
            parallel {
                stage("Lint") {
                    steps {
                        container('nodejs-' + nodeVersion) {
                            script {
                                catchError(buildResult: "UNSTABLE", stageResult: "FAILURE") {
                                    nodeCmd(
                                        install: true,
                                        script: "npm run lint"
                                    )
                                }
                            }
                        }
                    }
                }
                stage("TypeCheck") {
                    steps {
                        container('nodejs-' + nodeVersion) {
                            script {
                                catchError(buildResult: "UNSTABLE", stageResult: "FAILURE") {
                                    nodeCmd(
                                        install: true,
                                        script: "npm run type-check"
                                    )
                                }
                            }
                        }
                    }
                }
                stage("Unit Tests") {
                    steps {
                        container('nodejs-' + nodeVersion) {
                            script {
                                catchError(buildResult: "UNSTABLE", stageResult: "FAILURE") {
                                    nodeCmd(
                                        install: true,
                                        script: "npm run test"
                                    )
                                }
                            }
                        }
                    }
                    post {
                        success {
                            container('nodejs-' + nodeVersion) {
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
        stage("SonarQube Check") {
            when {
                allOf {
                    expression { isSonarQubeEnabled == true }
                }
            }
            steps {
                container('nodejs-' + nodeVersion) {
                    script {
                        // remove @zextras/ prefix to make pkgName a valid sonarqube project key
                        def sonarQubeProjectKey = pkgName.replaceAll("@zextras/", "")
                        withSonarQubeEnv(credentialsId: 'sonarqube-user-token', installationName: 'SonarQube instance') {
                            script {
                                npxCmd(
                                    script: "sonarqube-scanner -Dsonar.projectKey=${sonarQubeProjectKey} -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info"
                                )
                            }
                        }
                    }
                }
            }
        }
        stage("Build") {
            steps {
                container('nodejs-' + nodeVersion) {
                    nodeCmd(
                        install: true,
                        script: "npm run build"
                    )
                }
            }
        }
        stage('Release') {
            when {
                allOf {
                    expression { isPullRequest == false }
                }
            }
            steps {
                container('nodejs-' + nodeVersion) {
                    script {
                        withCredentials([usernamePassword(credentialsId: 'npm-zextras-bot-auth-token', usernameVariable: 'AUTH_USERNAME', passwordVariable: 'NPM_TOKEN')]) {
                            withCredentials([usernamePassword(credentialsId: 'tarsier-bot-pr-token-github', usernameVariable: 'GH_USERNAME', passwordVariable: 'GH_TOKEN')]) {
                                npxCmd(
                                    script: "semantic-release",
                                    install: true
                                )
                            }
                        }
                    }
                }
            }
        }
        stage('Open release to devel pull request') {
            when {
                allOf {
                    expression { isReleaseBranch == true }
                    expression { tagExistsAtHead() == true }
                }
            }
            steps {
                container('nodejs-' + nodeVersion) {
                    script {
                        catchError(buildResult: "UNSTABLE", stageResult: "FAILURE") {
                            String versionBumperBranchName = "version-bumper/${getLastTag()}"
                            sh(script: """
                                git push origin HEAD:refs/heads/${versionBumperBranchName}
                            """)
                            withCredentials([usernamePassword(credentialsId: 'tarsier-bot-pr-token-github', usernameVariable: 'GH_USERNAME', passwordVariable: 'GH_TOKEN')]) {
                                sh(script: """
                                    curl https://api.github.com/repos/${getRepositoryName()}/pulls \
                                    -X POST \
                                    -H 'Accept: application/vnd.github.v3+json' \
                                    -H 'Authorization: token ${GH_TOKEN}' \
                                    -d '{
                                        \"title\": \"chore(release): ${getLastTag()}\",
                                        \"head\": \"${versionBumperBranchName}\",
                                        \"base\": \"devel\",
                                        \"maintainer_can_modify\": true
                                    }'
                                """)
                            }
                        }
                    }
                }
            }
        }
    }
}

