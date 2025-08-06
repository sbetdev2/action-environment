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
    const mySecret = process.env.MY_SECRET
    const anotherSecret = process.env.ANOTHER_SECRET

    const gitRef = github.context.ref
    core.info(`GitHub Ref: ${gitRef}`)

    const hostsInput = core.getInput('hosts', { required: true })
    core.info(`Hosts file: ${hostsInput}!`)

    const targetHostsInput = core.getInput('target-hosts', { required: true })
    core.info(`Target hosts: ${targetHostsInput}!`)

    // Get the current time and set as an output

    const targetHosts = targetHostsInput.split(',').map((host) => host.trim())
    const hosts = JSON.parse(hostsInput)

    const matrix = hosts.find((h) => targetHosts.includes(h.hostName))

    core.info(`matrix: ${matrix}!`)
    core.setOutput('matrix', matrix)

    // Output the payload for debugging
    core.info(
      `The event payload: ${JSON.stringify(github.context.payload, null, 2)}`
    )
  } catch (error) {
    // Fail the workflow step if an error occurs
    core.setFailed(error.message)
  }
}
