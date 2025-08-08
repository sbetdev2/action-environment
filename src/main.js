import * as core from '@actions/core'
import * as github from '@actions/github'
import yaml from 'js-yaml'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */

const mergeHosts = (
  matrix,
  hosts,
  hostNames,
  privateKey,
  passphrase,
  isProd = false
) => {
  let newHosts = hosts
    .filter((h) => hostNames.includes(h.hostname))
    .map((h) => ({
      ...h,
      privateKey,
      passphrase,
      isProd
    }))

  core.info(`newHosts: ${JSON.stringify(newHosts)}`)
  return matrix.concat(newHosts)
}

export async function run() {
  try {
    const gitRef = github.context.ref
    core.info(`GitHub Ref: ${gitRef}`)
    const gitEventName = github.context.eventName
    core.info(`GitHub event name: ${gitEventName}`)

    const hostYaml = yaml.load(process.env.HOSTS_YAML)
    core.info(`Hosts file: ${JSON.stringify(hostYaml)}`)

    const productionPk = process.env.SSH_PRODUCTION_PRIVATE_KEY
    const staginPk = process.env.SSH_STAGING_PRIVATE_KEY
    const sshPassphrase = process.env.SSH_PASSPHRASE

    core.info(`Production hosts:`, productionPk)

    const productionHostsInput = core.getInput('production-hosts', {
      required: true
    })

    const stagingHostsInput = core.getInput('staging-hosts', {
      required: true
    })

    const productionHosts = productionHostsInput
      .split(',')
      .map((host) => host.trim())

    core.info(`Production hosts: ${JSON.stringify(productionHosts)}`)
    const stagingHosts = stagingHostsInput.split(',').map((host) => host.trim())

    let matrix = []
    let host = core.getInput('host')

    if (gitRef === 'refs/heads/master' && gitEventName === 'push') {
      matrix = mergeHosts(
        matrix,
        hostYaml.hosts.staging,
        stagingHosts,
        staginPk,
        sshPassphrase
      )
      matrix = mergeHosts(
        matrix,
        hostYaml.hosts.production,
        productionHosts,
        productionPk,
        sshPassphrase,
        true
      )
    } else if (gitEventName === 'workflow_dispatch' && host !== 'production') {
      matrix = mergeHosts(
        matrix,
        hostYaml.hosts.staging,
        stagingHosts,
        staginPk,
        sshPassphrase
      )
      core.setOutput('host', host)
    } else if (
      gitRef === 'refs/heads/master' &&
      gitEventName === 'workflow_dispatch' &&
      host === 'production'
    ) {
      matrix = mergeHosts(
        matrix,
        hostYaml.hosts.production,
        productionHosts,
        productionPk,
        sshPassphrase,
        true
      )
    }
    const matrixSerializaed = JSON.stringify(matrix)
    core.info(`matrix`)
    core.info(matrixSerializaed)
    core.setOutput('matrix', matrix)
    core.setOutput('branch', gitRef.replace('refs/heads/', ''))
    // core.info(
    //   `The event payload: ${JSON.stringify(github.context.payload, null, 2)}`
    // )
  } catch (error) {
    // Fail the workflow step if an error occurs
    core.setFailed(error.message)
  }
}
