import * as core from '@actions/core'
import * as github from '@actions/github'
import yaml from 'js-yaml'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */

const mergeHosts = (matrix, key, hostNames, hostYaml) => {
  core.info(`matrix: ${JSON.stringify(matrix)}`)
  core.info(`key: ${key}`)
  core.info(`hostNames: ${JSON.stringify(hostNames)}`)
  core.info(`hostYaml: ${JSON.stringify(hostYaml)}`)

  let newHosts = hostYaml.hosts[key]
    .filter((h) => hostNames.includes(h.hostname))
    .map((h) => ({
      ...h,
      privateKey: hostYaml.keys[key].privateKey,
      passphrase: hostYaml.keys[key].passphrase
    }))

  core.info(`newHosts: ${JSON.stringify(newHosts)}`)
  return matrix.concat(newHosts)
}

export async function run() {
  try {
    const gitRef = github.context.ref
    core.info(`GitHub Ref: ${gitRef}`)
    const gitEventName = github.context.eventName

    const hostYaml = yaml.load(process.env.HOSTS_YAML)
    core.info(`Hosts file: ${JSON.stringify(hostYaml)}`)

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
      mergeHosts(matrix, 'staging', stagingHosts, hostYaml)
      mergeHosts(matrix, 'production', productionHosts, hostYaml)
    } else if (
      gitEventName === 'workflow_dispatch' &&
      host === 'production' &&
      gitRef === 'refs/heads/master'
    ) {
      mergeHosts(matrix, 'production', productionHosts, hostYaml)
    } else {
      mergeHosts(matrix, 'staging', stagingHosts, hostYaml)
    }

    const matrixSerializaed = JSON.stringify(matrix)
    core.info(`matrix`)
    core.info(matrixSerializaed)
    core.setOutput('matrix', matrixSerializaed)
    core.setOutput('branch', gitRef.replace('refs/heads/', ''))
    // core.info(
    //   `The event payload: ${JSON.stringify(github.context.payload, null, 2)}`
    // )
  } catch (error) {
    // Fail the workflow step if an error occurs
    core.setFailed(error.message)
  }
}
