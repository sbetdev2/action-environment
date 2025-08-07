import * as core from '@actions/core'
import * as github from '@actions/github'
import yaml from 'js-yaml'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */

export async function run() {
  try {
    const gitRef = github.context.ref
    core.info(`GitHub Ref: ${gitRef}`)

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

    const matrix = hostYaml.hosts.production
      .filter((h) => productionHosts.includes(h.hostname))
      .map((o) => ({
        ...o,
        privateKey: hostYaml.keys.production.privateKey,
        passphrase: hostYaml.keys.production.passphrase
      }))

    const matrixSerializaed = JSON.stringify(matrix)
    core.info(`matrix`)
    core.info(matrixSerializaed)
    core.setOutput('matrix', matrixSerializaed)

    // core.info(
    //   `The event payload: ${JSON.stringify(github.context.payload, null, 2)}`
    // )
  } catch (error) {
    // Fail the workflow step if an error occurs
    core.setFailed(error.message)
  }
}
