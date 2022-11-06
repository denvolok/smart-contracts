// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

contract CrowdFunding {
    uint32 private constant CAMPAIGN_PERIOD_LIMIT = 90 days;

    struct Campaign {
        address payable owner;
        uint256 fundingGoal;
        uint256 fundingAmount;
        uint32 startAt;
        uint32 endAt;
        bool allowWithdrawal;
        bool claimed;
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributors;

    event Launch(
        uint256 campaignId,
        address indexed owner,
        uint256 fundingGoal,
        uint32 startAt,
        uint32 endAt
    );
    event Cancel(uint256 campaignId);
    event Contribution(uint256 campaignId, address indexed contributor, uint256 amount);
    /// NOTE: funds can be withdrawn on a running campaign after the goal reached
    event Withdrawal(uint256 campaignId, address indexed contributor, uint256 amount);
    event GoalReached(uint256 campaignId);
    event Claim(uint256 campaignId, address indexed owner);
    event Refund(uint256 campaignId, address indexed contributor);

    constructor() {}

    modifier onlyCampaignOwner(uint256 _campaignId) {
        require(campaigns[_campaignId].owner == msg.sender, "not campaign owner");
        _;
    }

    modifier isExistingCampaign(uint256 _campaignId) {
        require(campaigns[_campaignId].owner != address(0), "not existing campaign");
        _;
    }

    modifier isRunningCampaign(uint256 _campaignId) {
        Campaign storage campaign = campaigns[_campaignId];

        require(campaign.startAt <= block.timestamp && campaign.endAt >= block.timestamp);
        _;
    }

    modifier isFinishedCampaign(uint256 _campaignId) {
        require(campaigns[_campaignId].endAt <= block.timestamp);
        _;
    }

    function launchCampaign(
        uint256 _campaingId,
        uint256 _fundingGoal,
        uint32 _startAt,
        uint32 _endAt,
        bool _allowWithdrawal
    ) external {
        require(
            _campaingId != 0 && campaigns[_campaingId].owner == address(0),
            "invalid _campaignId"
        );
        require(_startAt > block.timestamp, "_startAt < now");
        require(_endAt < CAMPAIGN_PERIOD_LIMIT, "_endAt > max duration");

        campaigns[_campaingId] = Campaign({
            owner: payable(msg.sender),
            fundingGoal: _fundingGoal,
            fundingAmount: 0,
            startAt: _startAt,
            endAt: _endAt,
            allowWithdrawal: _allowWithdrawal,
            claimed: false
        });

        emit Launch(_campaingId, msg.sender, _fundingGoal, _startAt, _endAt);
    }

    function cancelCampaign(uint256 _campaignId)
        external
        isExistingCampaign(_campaignId)
        onlyCampaignOwner(_campaignId)
    {
        require(campaigns[_campaignId].startAt > block.timestamp, "campaign already started");

        delete campaigns[_campaignId];
        emit Cancel(_campaignId);
    }

    function contribute(uint256 _campaignId)
        external
        payable
        isExistingCampaign(_campaignId)
        isRunningCampaign(_campaignId)
    {
        Campaign storage campaign = campaigns[_campaignId];

        contributors[_campaignId][msg.sender] += msg.value;
        campaign.fundingAmount += msg.value;

        if (campaign.fundingAmount >= campaign.fundingGoal) {
            emit GoalReached(_campaignId);
        }
    }

    function withdraw(uint256 _campaignId, uint256 _amount)
        external
        isExistingCampaign(_campaignId)
        isRunningCampaign(_campaignId)
    {
        require(contributors[_campaignId][msg.sender] >= _amount, "amount exceeds contribution");

        campaigns[_campaignId].fundingAmount -= _amount;
        contributors[_campaignId][msg.sender] -= _amount;
        payable(msg.sender).transfer(_amount);

        emit Withdrawal(_campaignId, msg.sender, _amount);
    }

    function claim(uint256 _campaignId)
        external
        isExistingCampaign(_campaignId)
        isFinishedCampaign(_campaignId)
        onlyCampaignOwner(_campaignId)
    {
        Campaign storage campaign = campaigns[_campaignId];

        require(campaign.claimed == false, "already claimed");
        require(_isCampaignSucceeded(_campaignId) == true, "goal not reached");

        payable(msg.sender).transfer(campaign.fundingAmount);
        campaign.claimed = true;

        emit Claim(_campaignId, msg.sender);
    }

    function refund(uint256 _campaignId)
        external
        isExistingCampaign(_campaignId)
        isFinishedCampaign(_campaignId)
    {
        uint256 amount = contributors[_campaignId][msg.sender];

        require(_isCampaignSucceeded(_campaignId) == false, "campaign succeeded");
        require(amount > 0, "nothing to refund");

        contributors[_campaignId][msg.sender] = 0;
        payable(msg.sender).transfer(amount);

        emit Refund(_campaignId, msg.sender);
    }

    function _isCampaignSucceeded(uint256 _campaignId)
        private
        view
        isExistingCampaign(_campaignId)
        isFinishedCampaign(_campaignId)
        returns (bool)
    {
        Campaign storage campaign = campaigns[_campaignId];
        return campaign.fundingAmount >= campaign.fundingGoal;
    }
}
