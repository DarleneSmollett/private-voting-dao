// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint8, ebool, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title PrivateVotingDAO V2 - 升级版隐私投票治理合约
/// @notice 支持自定义选项名称、简化投票流程（移除权重）
contract PrivateVotingDAOV2 is SepoliaConfig {
    
    /// @notice 提案状态枚举
    enum ProposalStatus {
        Active,     // 进行中
        Ended,      // 已结束
        Cancelled   // 已取消
    }

    /// @notice 结果解封装策略枚举
    enum ResultStrategy {
        PublicOnEnd,        // 到期自动公开
        PrivateToOwner,     // 定向解封给提案所有者
        PrivateToDAO        // 定向解封给 DAO 管理员
    }

    /// @notice 提案结构
    struct Proposal {
        uint256 id;
        string title;
        string description;
        address proposer;
        uint256 startTime;
        uint256 endTime;
        string[] options;           // 选项名称数组
        ResultStrategy resultStrategy;
        ProposalStatus status;
        bool resultsRevealed;
    }

    /// @notice 用户投票记录（密文句柄）
    struct Vote {
        euint8 encryptedOption;     // 加密的选项索引
        bool hasVoted;
    }

    /// @notice 提案计数器
    uint256 public proposalCount;

    /// @notice DAO 管理员
    address public daoAdmin;

    /// @notice 最小法定人数
    uint256 public minQuorum = 1;

    /// @notice 提案存储
    mapping(uint256 => Proposal) public proposals;

    /// @notice 提案的选项密文计数 (proposalId => optionIndex => encryptedCount)
    mapping(uint256 => mapping(uint8 => euint32)) public proposalOptionVotes;

    /// @notice 提案的总投票人数 (proposalId => encryptedTotalVoters)
    mapping(uint256 => euint32) public proposalTotalVoters;

    /// @notice 用户投票记录 (proposalId => voter => Vote)
    mapping(uint256 => mapping(address => Vote)) public userVotes;

    /// @notice 用户投票的提案列表 (用户地址 => 提案ID数组)
    mapping(address => uint256[]) public userVotedProposals;

    /// @notice 提案创建事件
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        uint8 optionCount,
        uint256 startTime,
        uint256 endTime,
        ResultStrategy resultStrategy
    );

    /// @notice 投票事件
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter
    );

    /// @notice 提案结束事件
    event ProposalEnded(
        uint256 indexed proposalId
    );

    /// @notice 提案取消事件
    event ProposalCancelled(
        uint256 indexed proposalId
    );

    constructor() {
        daoAdmin = msg.sender;
    }

    /// @notice 修改器：仅 DAO 管理员
    modifier onlyAdmin() {
        require(msg.sender == daoAdmin, "Only DAO admin");
        _;
    }

    /// @notice 修改器：提案必须存在
    modifier proposalExists(uint256 proposalId) {
        require(proposalId > 0 && proposalId <= proposalCount, "Proposal does not exist");
        _;
    }

    /// @notice 修改器：提案必须处于活跃状态
    modifier proposalActive(uint256 proposalId) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.Active, "Proposal not active");
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        _;
    }

    /// @notice 设置 DAO 管理员
    function setDaoAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin address");
        daoAdmin = newAdmin;
    }

    /// @notice 设置最小法定人数
    function setMinQuorum(uint256 newQuorum) external onlyAdmin {
        minQuorum = newQuorum;
    }

    /// @notice 创建提案
    /// @param title 提案标题
    /// @param description 提案描述
    /// @param options 选项名称数组 (2-10个)
    /// @param duration 投票时长（秒）
    /// @param resultStrategy 结果解封装策略
    function createProposal(
        string memory title,
        string memory description,
        string[] memory options,
        uint256 duration,
        ResultStrategy resultStrategy
    ) external returns (uint256) {
        require(options.length >= 2 && options.length <= 10, "Options must be 2-10");
        require(duration > 0, "Duration must be positive");

        proposalCount++;
        uint256 proposalId = proposalCount;

        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;

        proposals[proposalId] = Proposal({
            id: proposalId,
            title: title,
            description: description,
            proposer: msg.sender,
            startTime: startTime,
            endTime: endTime,
            options: options,
            resultStrategy: resultStrategy,
            status: ProposalStatus.Active,
            resultsRevealed: false
        });

        // 初始化所有选项的计数为 0（密文）
        for (uint8 i = 0; i < options.length; i++) {
            proposalOptionVotes[proposalId][i] = FHE.asEuint32(0);
            FHE.allowThis(proposalOptionVotes[proposalId][i]);
        }

        // 初始化总投票人数为 0（密文）
        proposalTotalVoters[proposalId] = FHE.asEuint32(0);
        FHE.allowThis(proposalTotalVoters[proposalId]);

        emit ProposalCreated(
            proposalId,
            msg.sender,
            title,
            uint8(options.length),
            startTime,
            endTime,
            resultStrategy
        );

        return proposalId;
    }

    /// @notice 加密投票（简化版，无权重）
    /// @param proposalId 提案 ID
    /// @param encryptedOption 加密的选项索引
    /// @param optionProof 选项加密证明
    function castVote(
        uint256 proposalId,
        externalEuint8 encryptedOption,
        bytes calldata optionProof
    ) external proposalExists(proposalId) proposalActive(proposalId) {
        require(!userVotes[proposalId][msg.sender].hasVoted, "Already voted");

        // 转换外部加密输入为内部密文类型
        euint8 option = FHE.fromExternal(encryptedOption, optionProof);

        // 存储用户投票
        userVotes[proposalId][msg.sender] = Vote({
            encryptedOption: option,
            hasVoted: true
        });

        // 记录用户投票历史
        userVotedProposals[msg.sender].push(proposalId);

        // 授权用户访问自己的投票
        FHE.allow(option, msg.sender);
        FHE.allowThis(option);

        // 同态计票：为每个选项累加（每票权重为1）
        Proposal storage proposal = proposals[proposalId];
        for (uint8 i = 0; i < proposal.options.length; i++) {
            // 使用 FHE.select 实现密文分支
            ebool isThisOption = FHE.eq(option, FHE.asEuint8(i));
            euint32 voteToAdd = FHE.select(
                isThisOption,
                FHE.asEuint32(1),  // 每票计1
                FHE.asEuint32(0)
            );
            
            proposalOptionVotes[proposalId][i] = FHE.add(
                proposalOptionVotes[proposalId][i],
                voteToAdd
            );
            FHE.allowThis(proposalOptionVotes[proposalId][i]);
        }

        // 累加总投票人数
        proposalTotalVoters[proposalId] = FHE.add(
            proposalTotalVoters[proposalId],
            FHE.asEuint32(1)
        );
        FHE.allowThis(proposalTotalVoters[proposalId]);

        emit VoteCast(proposalId, msg.sender);
    }

    /// @notice 结束提案（自动，投票期结束后）
    function endProposal(uint256 proposalId) external proposalExists(proposalId) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.Active, "Proposal not active");
        require(block.timestamp > proposal.endTime, "Voting period not ended");

        proposal.status = ProposalStatus.Ended;

        emit ProposalEnded(proposalId);
    }

    /// @notice 提前结束提案（仅提案创建者或管理员）
    function forceEndProposal(uint256 proposalId) external proposalExists(proposalId) {
        Proposal storage proposal = proposals[proposalId];
        require(
            msg.sender == proposal.proposer || msg.sender == daoAdmin,
            "Not authorized"
        );
        require(proposal.status == ProposalStatus.Active, "Proposal not active");

        proposal.status = ProposalStatus.Ended;

        emit ProposalEnded(proposalId);
    }

    /// @notice 取消提案
    function cancelProposal(uint256 proposalId) external proposalExists(proposalId) {
        Proposal storage proposal = proposals[proposalId];
        require(
            msg.sender == proposal.proposer || msg.sender == daoAdmin,
            "Not authorized"
        );
        require(proposal.status == ProposalStatus.Active, "Proposal not active");

        proposal.status = ProposalStatus.Cancelled;

        emit ProposalCancelled(proposalId);
    }

    /// @notice 授权用户访问提案的投票结果
    function allowResultsAccess(uint256 proposalId) external proposalExists(proposalId) {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.resultStrategy == ResultStrategy.PublicOnEnd) {
            require(proposal.status == ProposalStatus.Ended, "Proposal not ended");
            
            for (uint8 i = 0; i < proposal.options.length; i++) {
                FHE.allow(proposalOptionVotes[proposalId][i], msg.sender);
            }
            FHE.allow(proposalTotalVoters[proposalId], msg.sender);
            
        } else if (proposal.resultStrategy == ResultStrategy.PrivateToOwner) {
            require(msg.sender == proposal.proposer, "Only proposer can access");
            require(proposal.status == ProposalStatus.Ended, "Proposal not ended");
            
            for (uint8 i = 0; i < proposal.options.length; i++) {
                FHE.allow(proposalOptionVotes[proposalId][i], msg.sender);
            }
            FHE.allow(proposalTotalVoters[proposalId], msg.sender);
            
        } else if (proposal.resultStrategy == ResultStrategy.PrivateToDAO) {
            require(msg.sender == daoAdmin, "Only DAO admin can access");
            require(proposal.status == ProposalStatus.Ended, "Proposal not ended");
            
            for (uint8 i = 0; i < proposal.options.length; i++) {
                FHE.allow(proposalOptionVotes[proposalId][i], msg.sender);
            }
            FHE.allow(proposalTotalVoters[proposalId], msg.sender);
        }

        proposal.resultsRevealed = true;
    }

    /// @notice 获取用户的投票
    function getMyVote(uint256 proposalId) 
        external 
        view 
        proposalExists(proposalId) 
        returns (euint8 encryptedOption) 
    {
        Vote storage vote = userVotes[proposalId][msg.sender];
        require(vote.hasVoted, "User has not voted");
        
        return vote.encryptedOption;
    }

    /// @notice 获取提案的选项投票结果句柄
    function getOptionVotes(uint256 proposalId, uint8 optionIndex) 
        external 
        view 
        proposalExists(proposalId) 
        returns (euint32) 
    {
        require(optionIndex < proposals[proposalId].options.length, "Invalid option index");
        return proposalOptionVotes[proposalId][optionIndex];
    }

    /// @notice 获取提案的总投票人数句柄
    function getTotalVoters(uint256 proposalId) 
        external 
        view 
        proposalExists(proposalId) 
        returns (euint32) 
    {
        return proposalTotalVoters[proposalId];
    }

    /// @notice 检查用户是否已投票
    function hasVoted(uint256 proposalId, address voter) 
        external 
        view 
        proposalExists(proposalId) 
        returns (bool) 
    {
        return userVotes[proposalId][voter].hasVoted;
    }

    /// @notice 获取提案详情
    function getProposal(uint256 proposalId) 
        external 
        view 
        proposalExists(proposalId) 
        returns (
            uint256 id,
            string memory title,
            string memory description,
            address proposer,
            uint256 startTime,
            uint256 endTime,
            string[] memory options,
            ResultStrategy resultStrategy,
            ProposalStatus status,
            bool resultsRevealed
        ) 
    {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.id,
            proposal.title,
            proposal.description,
            proposal.proposer,
            proposal.startTime,
            proposal.endTime,
            proposal.options,
            proposal.resultStrategy,
            proposal.status,
            proposal.resultsRevealed
        );
    }

    /// @notice 获取用户投票过的提案列表
    function getUserVotedProposals(address user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userVotedProposals[user];
    }

    /// @notice 获取提案选项名称
    function getProposalOptions(uint256 proposalId)
        external
        view
        proposalExists(proposalId)
        returns (string[] memory)
    {
        return proposals[proposalId].options;
    }
}

