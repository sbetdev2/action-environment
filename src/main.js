import * as core from '@actions/core'
import * as github from '@actions/github'

const isProductionHostName = (hostName) => {
  ;['Prod1', 'Prod2', 'Prod3', 'Prod4', 'Broker1', 'Broker2'].includes(hostName)
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */

export async function run() {
  try {
    // Access secrets from environment variables
    const sshPk = process.env.SSH_PRIVATE_KEY_PRODUCTION
    const sshPkPass = process.env.SSH_PRIVATE_KEY_PASSWORD_PRODUCTION

    const gitRef = github.context.ref
    core.info(`GitHub Ref: ${gitRef}`)

    const hostsInput = core.getInput('hosts', { required: true })
    core.info(`Hosts file: ${hostsInput}!`)

    const productionHostsInput = core.getInput('production-hosts', {
      required: true
    })
    core.info(`Production hosts: ${productionHostsInput}!`)

    const targetHosts = productionHostsInput
      .split(',')
      .map((host) => host.trim())
    const hosts = JSON.parse(hostsInput)

    const matrix = hosts
      .filter((h) => targetHosts.includes(h.hostname))
      .map((o) => ({
        ...o,
        privateKey: sshPk,
        passphrase: sshPkPass
      }))

    core.info(`matrix: ${matrix}!`)
    core.setOutput('matrix', ['Prod1', 'Prod2'])

    // Output the payload for debugging
    core.info(
      `The event payload: ${JSON.stringify(github.context.payload, null, 2)}`
    )
  } catch (error) {
    // Fail the workflow step if an error occurs
    core.setFailed(error.message)
  }
}
