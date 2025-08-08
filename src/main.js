import * as core from '@actions/core'
import * as github from '@actions/github'
import yaml from 'js-yaml'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */

const mergeHosts = (
  matrix,
  environment,
  envYaml,
  hostNames,
  privateKey,
  passphrase,
  hostname
) => {
  const hosts = envYaml.environments[environment] || []
  const newHosts = hosts
    .filter((h) => hostNames.includes(h.hostname))
    .map((h) => ({
      ...h,
      hostname: hostname || h.hostname,
      // passphrase,
      environment,
      isProd: environment === 'production'
    }))

  return matrix.concat(newHosts)
}

export async function run() {
  try {
    const gitRef = github.context.ref
    const gitEventName = github.context.eventName

    const environmentsYaml = yaml.load(process.env.ENVIRONMENTS_YAML)
    const productionPk = process.env.SSH_PRODUCTION_PRIVATE_KEY
    const staginPk = process.env.SSH_STAGING_PRIVATE_KEY
    const sshPassphrase = process.env.SSH_PASSPHRASE

    const productionHostsInput = core.getInput('production-hosts', {
      required: true
    })

    const stagingHostsInput = core.getInput('staging-hosts', {
      required: true
    })

    const productionHosts = productionHostsInput
      .split(',')
      .map((host) => host.trim())

    const stagingHosts = stagingHostsInput.split(',').map((host) => host.trim())

    let matrix = []
    const hostname = core.getInput('hostname')

    if (gitRef === 'refs/heads/master' && gitEventName === 'push') {
      matrix = mergeHosts(
        matrix,
        'staging',
        environmentsYaml,
        stagingHosts,
        staginPk,
        sshPassphrase
      )
      matrix = mergeHosts(
        matrix,
        'production',
        environmentsYaml,
        productionHosts,
        productionPk,
        sshPassphrase
      )
    } else if (
      gitEventName === 'workflow_dispatch' &&
      hostname !== 'production'
    ) {
      matrix = mergeHosts(
        matrix,
        'staging',
        environmentsYaml,
        stagingHosts,
        staginPk,
        sshPassphrase,
        hostname
      )
    } else if (
      gitRef === 'refs/heads/master' &&
      gitEventName === 'workflow_dispatch' &&
      hostname === 'production'
    ) {
      matrix = mergeHosts(
        matrix,
        'production',
        environmentsYaml,
        productionHosts,
        productionPk,
        sshPassphrase
      )
    }
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
