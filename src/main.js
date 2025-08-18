import * as core from '@actions/core'
import * as github from '@actions/github'
import yaml from 'js-yaml'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */

const mergeHosts = (matrix, environment, envYaml, hostNames, hostname) => {
  const hosts = envYaml.environments[environment] || []
  const newHosts = hosts
    .filter((h) => hostNames.includes(h.hostname))
    .map((h) => ({
      ...h,
      hostname: hostname || h.hostname,
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
    // const productionPk = process.env.SSH_PRODUCTION_PRIVATE_KEY
    // const staginPk = process.env.SSH_STAGING_PRIVATE_KEY
    // const sshPassphrase = process.env.SSH_PASSPHRASE

    const productionHostsInput = core.getInput('production-hosts', {
      required: true
    })

    const stagingHostsInput = core.getInput('staging-hosts')

    const productionHosts = productionHostsInput
      .split(',')
      .map((host) => host.trim())

    const stagingHosts = stagingHostsInput.split(',').map((host) => host.trim())

    let matrix = []
    let hostname = core.getInput('hostname')?.trim()
    const environment = core.getInput('environment')
    let hosts = null

    if (gitRef === 'refs/heads/master' && gitEventName === 'push') {
      matrix = mergeHosts(matrix, 'staging', environmentsYaml, stagingHosts)
      matrix = mergeHosts(
        matrix,
        'production',
        environmentsYaml,
        productionHosts
      )
    } else if (gitEventName === 'workflow_dispatch') {
      switch (environment) {
        case 'staging':
          hosts = stagingHosts
          break
        case 'preproduction':
          hosts = stagingHosts
          break
        case 'production':
          if (
            hostname &&
            hostname !== 'all production hosts' &&
            !productionHosts.includes(hostname)
          ) {
            throw new Error(
              `The provided hostname "${hostname}" is not in the list of hosts.`
            )
          }

          if (gitRef !== 'refs/heads/master') {
            throw new Error(
              `The environment "production" can only be deployed from the "master" branch.`
            )
          }

          hosts = productionHosts
          break
        default:
          if (!environment && stagingHosts.indexOf(hostname) !== -1) {
            if (!hostname && stagingHosts.length !== 0) {
              hostname = stagingHosts[0]
            }

            hosts = stagingHosts
          } else {
            throw new Error(
              `The action can only be triggered by a push to the "master" branch or by a workflow dispatch event.`
            )
          }
          break
      }
      matrix = mergeHosts(
        matrix,
        environment,
        environmentsYaml,
        hosts,
        hostname
      )
    } else {
      throw new Error(
        `The action can only be triggered by a push to the "master" branch or by a workflow dispatch event.`
      )
    }

    core.setOutput('matrix', matrix)
    core.setOutput('branch', gitRef.replace('refs/heads/', ''))
    core.info(
      `hostnames for deployment: ${JSON.stringify(
        matrix.map((h) => h),
        null,
        2
      )}`
    )
    // core.info(
    //   `The event payload: ${JSON.stringify(github.context.payload, null, 2)}`
    // )
  } catch (error) {
    core.setFailed(error.message)
  }
}
